import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  const baseClasses = "bg-surface shadow-md rounded-xl border border-border text-text-dark p-6 transition-all duration-300";
  const clickableClasses = onClick ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer" : "hover:shadow-lg";

  return (
    <div className={`${baseClasses} ${clickableClasses} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;