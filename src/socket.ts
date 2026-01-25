import { io } from 'socket.io-client'

// Підключаємося до backend
export const socket = io('http://localhost:3000')
