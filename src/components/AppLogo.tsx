import React from 'react';

interface AppLogoProps {
  lightModeImageUrl?: string;
  darkModeImageUrl?: string;
  isDarkMode?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  lightModeImageUrl, 
  darkModeImageUrl, 
  isDarkMode = false 
}) => {
  const imageUrl = isDarkMode ? darkModeImageUrl : lightModeImageUrl;

  if (!imageUrl) {
    return null;
  }

  return (
    <img 
      src={imageUrl} 
      alt="Church Logo" 
      className="h-16 w-auto max-w-xs"
    />
  );
};
