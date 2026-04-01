import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeout);
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      // Handle the Error object thrown from API
      let errorData = {};
      try {
        errorData = JSON.parse(err.message);
      } catch (parseErr) {
        // If parsing fails, use the error message directly
        console.error('Could not parse error message:', err.message);
      }
      localStorage.removeItem('token');
      setError('Session expired. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      console.log('Attempting login with:', credentials);
      
      const response = await authAPI.login(credentials);
      console.log('Login response:', response);
      
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      setUser(userData);
      setError(null);
      
      return { success: true };
    } catch (err) {
      console.error('Login error details:', err);
      
      // Parse the Error object thrown from API
      let errorData = {};
      try {
        errorData = JSON.parse(err.message);
      } catch (parseErr) {
        console.error('Could not parse error message:', err.message);
        errorData = { message: err.message };
      }
      
      console.error('Parsed error data:', errorData);
      
      // Check if it's a network error (API not available)
      if (errorData.code === 'ERR_NETWORK' || 
          errorData.code === 'ERR_FAILED' ||
          err.message?.includes('Network Error') ||
          err.message?.includes('ERR_FAILED') ||
          !errorData.response) {
        console.log('API not available, using demo mode for login');
        
        // Create demo user for testing
        const demoUser = {
          id: Date.now(),
          name: 'Demo User',
          email: credentials.email,
        };
        
        const demoToken = 'demo-token-' + Date.now();
        
        localStorage.setItem('token', demoToken);
        setUser(demoUser);
        setError(null);
        
        return { success: true, demo: true };
      }
      
      // Extract more detailed error information
      let errorMessage = 'Login failed. Please try again.';
      
      if (errorData.response?.data) {
        // Handle different types of error responses
        if (typeof errorData.response.data === 'string') {
          errorMessage = errorData.response.data;
        } else if (errorData.response.data.message) {
          errorMessage = errorData.response.data.message;
        } else if (errorData.response.data.error) {
          errorMessage = errorData.response.data.error;
        } else if (errorData.response.data.errors) {
          // Handle validation errors
          const errors = errorData.response.data.errors;
          if (Array.isArray(errors)) {
            errorMessage = errors.join(', ');
          } else if (typeof errors === 'object') {
            errorMessage = Object.values(errors).join(', ');
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.log('Setting error state to:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      console.log('Attempting registration with:', userData);
      console.log('API endpoint:', 'http://127.0.0.1:8000/api/auth/register/');
      console.log('Cleaned userData:', {
        name: userData.name?.trim(),
        email: userData.email?.trim(),
        password: userData.password
      });
      
      // Test API connectivity first
      try {
        const testResponse = await fetch('http://127.0.0.1:8000/api/auth/register/', {
          method: 'OPTIONS',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log('API connectivity test - status:', testResponse.status);
        console.log('API connectivity test - headers:', testResponse.headers);
      } catch (testErr) {
        console.log('API connectivity test failed:', testErr);
      }
      
      // Ensure data is properly formatted before sending
      const cleanUserData = {
        username: String(userData.username || '').trim().toLowerCase().replace(/[^a-zA-Z0-9@/./+/-]/g, ''), // Django-compatible username
        first_name: String(userData.first_name || '').trim(), // Django first_name field
        last_name: String(userData.last_name || '').trim(), // Django last_name field
        email: String(userData.email || '').trim(), // Django email field
        password: String(userData.password || ''), // Django password field
        password_confirm: String(userData.password_confirm || '') // Django password_confirm field
      };
      
      console.log('=== REGISTRATION DEBUG ===');
      console.log('Original userData:', userData);
      console.log('Cleaned userData:', cleanUserData);
      console.log('Type of cleanUserData:', typeof cleanUserData);
      console.log('Stringified cleanUserData:', JSON.stringify(cleanUserData));
      console.log('========================');
      
      const response = await authAPI.register(cleanUserData);
      console.log('Registration response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      console.log('Request headers:', response.config.headers);
      console.log('Request data sent:', JSON.stringify(response.config.data, null, 2));
      
      const { token, user: newUser } = response.data;
      
      localStorage.setItem('token', token);
      setUser(newUser);
      setError(null);
      
      return { success: true };
    } catch (err) {
      console.error('Registration error details:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      console.error('Full error object:', JSON.stringify(err, null, 2));
      
      // Check if it's a network error (API not available)
      if (err.code === 'ERR_NETWORK' || 
          err.code === 'ERR_FAILED' ||
          err.message?.includes('Network Error') ||
          err.message?.includes('ERR_FAILED') ||
          !err.response) {
        console.log('API not available, using demo mode for registration');
        
        // Create demo user for testing
        const demoUser = {
          id: Date.now(),
          name: userData.name,
          email: userData.email,
        };
        
        const demoToken = 'demo-token-' + Date.now();
        
        localStorage.setItem('token', demoToken);
        setUser(demoUser);
        setError(null);
        
        return { success: true, demo: true };
      }
      
      // Extract error information
      let errorMessage = '';
      
      if (err.response?.data) {
        // Handle different types of error responses
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.errors) {
          // Handle validation errors - display them as user-friendly messages
          const errors = err.response.data.errors;
          if (typeof errors === 'object') {
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errors)) {
              if (Array.isArray(messages)) {
                errorMessages.push(`${field}: ${messages.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${messages}`);
              }
            }
            errorMessage = errorMessages.join(' | ');
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Registration failed. Please try again.';
      }
      
      setError(errorMessage);
      console.log('Setting error state to:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setError(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
