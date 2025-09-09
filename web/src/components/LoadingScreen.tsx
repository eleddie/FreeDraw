import React from "react";

interface LoadingScreenProps {
  width: number;
  height: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ width, height }) => {
  const isDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          fontFamily: "DeliciousHandrawn-Regular, sans-serif",
          color: isDarkTheme ? "#ffffff" : "#000000",
        }}
      >
        Loading...
      </div>
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid #f3f3f3",
          borderTop: "3px solid #3498db",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingScreen;
