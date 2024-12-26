import React, { useContext, useEffect } from 'react'
import { SocketContext, SocketContextType } from '../hooks/useSocket'

const StreamAnalytics = () => {
  const { socket } = useContext(SocketContext) as SocketContextType


  useEffect(()=>{
    if(!socket) return;
    
    socket.on('streamChartData', (data) => {
      // Update the streamData state with the received data
      console.log(data)
    })
  },[socket])

  return (
    <div>StreamAnalytics</div>
  )
}

export default StreamAnalytics