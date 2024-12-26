import React, { createContext, useEffect, useState, PropsWithChildren } from "react";  
import { io, Socket } from "socket.io-client";  

// Define an interface for User data  
interface User {  
  _id: string;  
  name: string;  
  email: string;  
  streamKey: string;  
  isLive: boolean;  
}  

// Define a context type that combines Socket and User  
export interface SocketContextType {  
  socket: Socket | null;  
  user: User | null;  
  setUser: React.Dispatch<React.SetStateAction<User | null>>;  
}  

// Create the context  
export const SocketContext = createContext<SocketContextType | undefined>(undefined);  

// Provider component  
export const SocketProvider = ({ children }: PropsWithChildren) => {  
  const [socket, setSocket] = useState<Socket | null>(null);  

  const [user, setUser] = useState<User | null>(null);  

  useEffect(() => {  
    const storedUser = localStorage.getItem("user");  
    if (storedUser) {  
      setUser(JSON.parse(storedUser));  
    }  
  }, []);  

  useEffect(() => {  
    if (user?._id) {  
      const socketClient: Socket = io("http://localhost:5555", {  
        query: { authId: user._id },  
      });  

      socketClient.on("connect", () => {  
        console.log("Connected to server");  
      });  

      setSocket(socketClient);  

      return () => {  
        socketClient.disconnect();  
      };  
    }  
  }, [user]);  

  return (  
    <SocketContext.Provider value={{ socket, user, setUser }}>  
      {children}  
    </SocketContext.Provider>  
  );  
};