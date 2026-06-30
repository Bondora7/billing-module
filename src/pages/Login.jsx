import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username === 'admin' && password === 'admin') {
      setError('')
      const mockToken = 'mock-jwt-token-' + Date.now()
      localStorage.setItem('accessToken', mockToken)
      localStorage.setItem('user', JSON.stringify({ username }))
      onLogin()
    } else {
      setError('Invalid credentials. Use admin/admin')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="mall-icon">
            <ShoppingBag size={48} />
          </div>
          <h1>Mall Billing System</h1>
          <p>Point of Sale Terminal - Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">🔒 Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-primary">Sign In</button>
        </form>
        <div className="login-footer">
          <p>🛍️ Demo credentials: admin / admin</p>
        </div>
      </div>
    </div>
  )
}