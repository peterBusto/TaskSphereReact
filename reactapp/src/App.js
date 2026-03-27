import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import TaskForm from './components/TaskForm';
import TaskItem from './components/TaskItem';
import TaskStats from './components/TaskStats';
import Login from './components/Login';
import Register from './components/Register';
import UserProfile from './components/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import { taskAPI } from './services/api';

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check if we're in demo mode
    const token = localStorage.getItem('token');
    if (token && token.startsWith('demo-token-')) {
      setDemoMode(true);
    }
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      console.log('Fetching tasks...');
      console.log('Current authenticated user:', user);
      const token = localStorage.getItem('token');
      console.log('Using token:', token);
      
      const response = await taskAPI.getAllTasks();
      console.log('Tasks API response:', response);
      console.log('Response data:', response.data);
      
      // Handle Django API response format: {tasks: [], count: 0}
      const tasksData = response.data?.tasks || response.data || [];
      console.log('Extracted tasks data:', tasksData);
      
      // Map Django API fields to React component expectations
      const mappedTasks = Array.isArray(tasksData) ? tasksData.map(task => {
        console.log('Original task from API:', task);
        const mappedTask = {
          ...task,
          completed: task.status === 'completed' || task.completed_at !== null,  // Map status to completed
          dueDate: task.due_date  // Map due_date to dueDate
        };
        console.log('Mapped task:', mappedTask);
        return mappedTask;
      }) : [];
      
      console.log('Mapped tasks:', mappedTasks);
      setTasks(mappedTasks);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tasks. Using demo data.');
      // Demo data for when API is not available
      setTasks([
        {
          id: 1,
          title: 'Complete project documentation',
          description: 'Write comprehensive documentation for the new API endpoints',
          priority: 'high',
          dueDate: '2024-12-30',
          completed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Review pull requests',
          description: 'Check and approve pending PRs from the team',
          priority: 'medium',
          dueDate: '2024-12-25',
          completed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 3,
          title: 'Update dependencies',
          description: 'Update all npm packages to latest stable versions',
          priority: 'low',
          dueDate: '2024-12-28',
          completed: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (taskData) => {
    try {
      // Debug authentication status
      const token = localStorage.getItem('token');
      console.log('Creating task with token:', token);
      console.log('Current user:', user);
      console.log('Task data being sent:', taskData);
      
      const response = await taskAPI.createTask(taskData);
      console.log('Create task API response:', response);
      console.log('Create task response data:', response.data);
      
      // Handle Django API response format: {message: '', task: {...}}
      const newTask = response.data?.task || response.data || {
        ...taskData,
        id: Date.now(),
      };
      console.log('Raw newTask from API:', newTask);
      
      // Map the response to ensure dueDate field is correct
      const finalNewTask = {
        ...newTask,
        dueDate: newTask.due_date || newTask.dueDate || taskData.due_date
      };
      console.log('Final new task to add to state:', finalNewTask);
      setTasks([...tasks, finalNewTask]);
    } catch (err) {
      console.error('Failed to create task:', err);
      console.error('Error response:', err.response);
      
      // If API fails, add to local state
      const newTask = {
        ...taskData,
        id: Date.now(),
      };
      setTasks([...tasks, newTask]);
    }
  };

  const handleUpdateTask = async (id, taskData) => {
    try {
      console.log('Updating task:', id, taskData);
      const response = await taskAPI.updateTask(id, taskData);
      console.log('Update response:', response);
      
      // Handle Django API response format
      const updatedTask = response.data?.task || response.data || { ...taskData, id };
      console.log('Updated task data from API:', updatedTask);
      
      // Map the response to ensure dueDate field is correct
      const finalUpdatedTask = {
        ...updatedTask,
        dueDate: updatedTask.due_date || updatedTask.dueDate
      };
      console.log('Final updated task for state:', finalUpdatedTask);
      
      // Use functional update to avoid race conditions
      setTasks(prevTasks => 
        prevTasks.map(task => task.id === id ? finalUpdatedTask : task)
      );
    } catch (err) {
      console.error('Failed to update task:', err);
      // If API fails, update local state
      const fallbackTask = {
        ...taskData,
        id,
        dueDate: taskData.due_date || taskData.dueDate
      };
      
      // Use functional update for fallback as well
      setTasks(prevTasks => 
        prevTasks.map(task => task.id === id ? fallbackTask : task)
      );
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await taskAPI.deleteTask(id);
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err) {
      // If API fails, remove from local state
      setTasks(tasks.filter(task => task.id !== id));
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'completed' && task.completed) ||
                         (filterStatus === 'pending' && !task.completed);
    
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Group tasks by status for Kanban board
  const tasksByStatus = {
    todo: filteredTasks.filter(task => task.status === 'todo' || (!task.status && !task.completed)),
    in_progress: filteredTasks.filter(task => task.status === 'in_progress'),
    completed: filteredTasks.filter(task => task.status === 'completed' || task.completed)
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = {
        ...task,
        status: newStatus,
        completed: newStatus === 'completed'
      };
      handleUpdateTask(taskId, updatedTask);
      
      // Small delay to ensure UI updates properly
      setTimeout(() => {
        console.log('Task status updated after delay:', updatedTask);
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TaskSphere</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTaskForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Add Task
              </button>
              <UserProfile />
            </div>
          </div>
        </header>

        {demoMode && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  <strong>Demo Mode:</strong> Your TaskSphere API at 127.0.0.1:8000 is not available. 
                  The app is running with demo data for testing purposes.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Once your backend API is running, the app will automatically connect to it.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && !demoMode && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">{error}</p>
          </div>
        )}

        <TaskStats tasks={tasks} />

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
              
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

                          </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">To Do</h2>
              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                {tasksByStatus.todo.length}
              </span>
            </div>
            <div 
              className="space-y-3 min-h-[200px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'todo')}
            >
              {tasksByStatus.todo.map(task => (
                <div
                  key={task.id || `task-${task.title}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="cursor-move"
                >
                  <TaskItem
                    key={`${task.id}-${task.status}-${task.completed}`}
                    task={task}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                  />
                </div>
              ))}
              {tasksByStatus.todo.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No tasks to do</p>
                </div>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-blue-700">In Progress</h2>
              <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                {tasksByStatus.in_progress.length}
              </span>
            </div>
            <div 
              className="space-y-3 min-h-[200px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'in_progress')}
            >
              {tasksByStatus.in_progress.map(task => (
                <div
                  key={task.id || `task-${task.title}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="cursor-move"
                >
                  <TaskItem
                    key={`${task.id}-${task.status}-${task.completed}`}
                    task={task}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                  />
                </div>
              ))}
              {tasksByStatus.in_progress.length === 0 && (
                <div className="text-center py-8 text-blue-400">
                  <p className="text-sm">No tasks in progress</p>
                </div>
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-green-700">Completed</h2>
              <span className="bg-green-200 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                {tasksByStatus.completed.length}
              </span>
            </div>
            <div 
              className="space-y-3 min-h-[200px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'completed')}
            >
              {tasksByStatus.completed.map(task => (
                <div
                  key={task.id || `task-${task.title}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="cursor-move"
                >
                  <TaskItem
                    key={`${task.id}-${task.status}-${task.completed}`}
                    task={task}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                  />
                </div>
              ))}
              {tasksByStatus.completed.length === 0 && (
                <div className="text-center py-8 text-green-400">
                  <p className="text-sm">No completed tasks</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showTaskForm && (
          <TaskForm
            onAddTask={handleAddTask}
            onClose={() => setShowTaskForm(false)}
          />
        )}
      </div>
    </div>
  );
}

function AuthPages() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <>
      {isLogin ? (
        <Login onToggleMode={() => setIsLogin(false)} />
      ) : (
        <Register onToggleMode={() => setIsLogin(true)} />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthPages />} />
          <Route path="/register" element={<AuthPages />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
