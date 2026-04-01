import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://task-sphere-django.vercel.app';

// Helper function to get cookies
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  
  // Remove CSRF token for API requests
  // const csrfToken = getCookie('csrftoken');
  // if (csrfToken) {
  //   config.headers['X-CSRFToken'] = csrfToken;
  // }
  
  return config;
});

export const authAPI = {
  login: async (credentials) => {
    console.log('Sending login request to:', `${API_BASE_URL}/api/auth/login/`);
    console.log('Login credentials:', credentials);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Remove CSRF token for API login
      },
      body: JSON.stringify(credentials),
    });
    
    console.log('Login response status:', response.status);
    console.log('Login response headers:', response.headers);
    
    const result = handleResponse(response);
    console.log('Login result:', result);
    return result;
  },
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },
  logout: () => api.post('/api/auth/logout/'),
  getCurrentUser: () => api.get('/api/auth/profile/'),  // Fixed: use profile endpoint
  refreshToken: () => api.post('/api/auth/refresh/'),
};

// Helper function to handle fetch responses
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw {
      response: { data },
      status: response.status,
      code: response.status === 400 ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK'
    };
  }
  return { data, status: response.status };
};

export const taskAPI = {
  getAllTasks: () => api.get('/api/tasks/'),
  getTask: (id) => api.get(`/api/tasks/${id}/`),
  createTask: (taskData) => {
    console.log('Creating task with data:', taskData);
    const result = api.post('/api/tasks/create/', taskData);
    console.log('Task creation result:', result);
    return result;
  },
  updateTask: (id, taskData) => api.put(`/api/tasks/${id}/update/`, taskData),
  deleteTask: (id) => api.delete(`/api/tasks/${id}/delete/`),
  toggleTaskComplete: (id) => api.patch(`/api/tasks/${id}/toggle/`),
};

export default api;
