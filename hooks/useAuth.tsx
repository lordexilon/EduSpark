

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void; // Simulate login
  logout: () => void; // Simulate logout
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For this demo, default to a logged-in student.
  // In a real app, this would be null initially and set after login.
  const [user, setUser] = useState<User | null>({
    id: 'student123',
    name: 'Álex Pérez', 
    email: 'alex.perez@example.com', 
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop'
  });

  // Simulate login (e.g., after a form submission)
  const login = (userData: User) => {
    setUser(userData);
    // In a real app, save token to localStorage, etc.
  };

  // Simulate logout
  const logout = () => {
    setUser(null);
    // In a real app, clear token from localStorage, etc.
  };
  
  // Persist user slightly for demo purposes if needed, or load from localStorage
  // useEffect(() => {
  //   const storedUser = localStorage.getItem('currentUser');
  //   if (storedUser) {
  //     setUser(JSON.parse(storedUser));
  //   }
  // }, []);

  // useEffect(() => {
  //   if (user) {
  //     localStorage.setItem('currentUser', JSON.stringify(user));
  //   } else {
  //     localStorage.removeItem('currentUser');
  //   }
  // }, [user]);


  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};