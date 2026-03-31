import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from './app/providers'
import './app/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <h1 className="text-xl font-semibold">PathBuddy</h1>
      </div>
    </AppProviders>
  </React.StrictMode>
)
