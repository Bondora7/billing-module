import { useState, useRef } from 'react'
import { Search, ShoppingCart, LogOut, X, Printer, CheckCircle, Wifi, WifiOff } from 'lucide-react'

const MOCK_PRODUCTS = [
  { id: 1, name: 'Classic Fit Polo Shirt', category: 'Clothing', price: 49.99, sku: 'POLO-001', color: 'Navy Blue' },
  { id: 2, name: 'Slim Fit Chinos', category: 'Clothing', price: 59.99, sku: 'CHIN-001', color: 'Beige' },
  { id: 3, name: 'Cotton Crew Neck T-Shirt', category: 'Clothing', price: 24.99, sku: 'TSH-001', color: 'White' },
  { id: 4, name: 'Wool Blend Sweater', category: 'Clothing', price: 79.99, sku: 'SWT-001', color: 'Gray' },
  { id: 5, name: 'Denim Jacket', category: 'Clothing', price: 89.99, sku: 'JACK-001', color: 'Indigo' },
  { id: 6, name: 'Formal Dress Shirt', category: 'Clothing', price: 69.99, sku: 'DRS-001', color: 'Light Blue' },
  { id: 7, name: 'Casual Shorts', category: 'Clothing', price: 39.99, sku: 'SHRT-001', color: 'Khaki' },
  { id: 8, name: 'Leather Belt', category: 'Accessories', price: 34.99, sku: 'BELT-001', color: 'Brown' },
]

const CATEGORIES = ['All', 'Clothing', 'Accessories', 'Shoes', 'Watches']

export default function Dashboard({ user, onLogout }) {
  const [purchases, setPurchases] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [printerStatus, setPrinterStatus] = useState('online')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const receiptRef = useRef(null)

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (product, qty = 1) => {
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: qty }])
    }
    setSelectedProduct(null)
    setQuantity(1)
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
    setPaymentMethod('')
    setPaymentSuccess(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    onLogout()
  }

  const updateCartQuantity = (id, qty) => {
    if (qty < 1) return
    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity: qty } : item
    ))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const tax = cartTotal * 0.0
  const finalTotal = cartTotal + tax

  const getCurrentDateTime = () => {
    const now = new Date()
    return {
      date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      receiptNo: Math.floor(Math.random() * 90000) + 10000
    }
  }

  const currentDateTime = getCurrentDateTime()

  const handlePaymentSelection = (method) => {
    setPaymentMethod(method)
    setPaymentSuccess(false)
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    if (!paymentMethod) return
    
    setPrinterStatus('printing')
    setTimeout(() => {
      setPrinterStatus('online')
      setPaymentSuccess(true)
      alert('Payment Successful! Receipt printed.')
      window.print()
    }, 1500)
    
    const newPurchase = {
      id: Date.now(),
      receiptNo: currentDateTime.receiptNo,
      customerName: customerName || 'Walk-in Customer',
      items: cart,
      subtotal: cartTotal,
      tax: tax,
      total: finalTotal,
      paymentMethod,
      date: currentDateTime.date,
      time: currentDateTime.time,
    }
    setPurchases([newPurchase, ...purchases])
    
    // Don't clear cart immediately, let user see success
    setTimeout(() => {
      setCart([])
      setCustomerName('')
      setPaymentMethod('')
      setPaymentSuccess(false)
    }, 2000)
  }

  return (
    <div className="dashboard">
      <div className="pos-container">
        {/* Left Side - Product Selection */}
        <div className="pos-left">
          {/* Top Header */}
          <div className="pos-header">
            <div className="pos-header-top">
              <div className="pos-brand">
                <ShoppingCart size={26} />
                <h1>Fashion Store POS</h1>
              </div>
              <div className="pos-user-info">
                <div className="pos-cashier">
                  <div className="pos-avatar">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div className="pos-username">
                      {user ? `${user.firstName} ${user.lastName}` : 'Admin Cashier'}
                    </div>
                    <div className="pos-role">Terminal #01</div>
                  </div>
                </div>
                <button onClick={handleLogout} className="btn-logout">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="pos-search-bar">
              <div className="search-bar">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="category-tabs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="product-grid">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="product-card"
                onClick={() => addToCart(product)}
              >
                <div className="product-image">👕</div>
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-sku">{product.sku}</div>
                </div>
                <div className="product-footer">
                  <div className="product-price">${product.price.toFixed(2)}</div>
                  <button className="add-btn" onClick={() => addToCart(product)}>+</button>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="empty-state">
              <Search size={48} />
              <h3>No Products Found</h3>
              <p>Try adjusting your search or category filter</p>
            </div>
          )}
        </div>

        {/* Right Side - Cart & Receipt Panel */}
        <div className="pos-right">
          <div className="cart-header">
            <div className="cart-title">
              <h2>
                <ShoppingCart size={22} />
                Current Sale
              </h2>
              <span className="cart-badge">{cartCount} items</span>
            </div>
            <div className="cart-subtitle">
              {currentDateTime.date} | {currentDateTime.time}
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart size={64} />
              <h3>Cart is Empty</h3>
              <p>Click on products to add them to cart</p>
            </div>
          ) : (
            <>
              {/* Cart Items - Show Latest Item */}
              <div className="cart-items">
                {cart.length > 0 && (
                  <div className="cart-item cart-item-single">
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: 'var(--text-light)', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '8px'
                    }}>
                      Latest Item ({cart.length} total)
                    </div>
                    <div className="cart-item-header">
                      <div className="cart-item-name">{cart[cart.length - 1].name}</div>
                      <div className="cart-item-price">
                        ${(cart[cart.length - 1].price * cart[cart.length - 1].quantity).toFixed(2)}
                      </div>
                    </div>
                    <div className="cart-item-footer">
                      <div className="cart-item-actions">
                        <button 
                          className="qty-btn" 
                          onClick={() => updateCartQuantity(cart[cart.length - 1].id, cart[cart.length - 1].quantity - 1)}
                        >
                          −
                        </button>
                        <span className="qty-display">{cart[cart.length - 1].quantity}</span>
                        <button 
                          className="qty-btn" 
                          onClick={() => updateCartQuantity(cart[cart.length - 1].id, cart[cart.length - 1].quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        className="btn-remove" 
                        onClick={() => removeFromCart(cart[cart.length - 1].id)}
                        title="Remove item"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Checkout Section */}
              <div className="cart-summary">
                {/* Printer Status */}
                <div className="printer-status">
                  {printerStatus === 'online' ? (
                    <>
                      <div className="printer-dot"></div>
                      <Printer size={14} />
                      <span>Printer Ready</span>
                    </>
                  ) : (
                    <>
                      <div className="printer-dot" style={{ background: '#f59e0b' }}></div>
                      <span>Printing...</span>
                    </>
                  )}
                </div>

                {/* Customer Name */}
                <div className="customer-section">
                  <label>Customer Name (Optional)</label>
                  <input
                    type="text"
                    className="customer-input"
                    placeholder="Enter customer name..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                {/* Payment Method Selection */}
                {!paymentSuccess && (
                  <div className="payment-section">
                    <label>Payment Method</label>
                    <div className="payment-options">
                      <div
                        className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}
                        onClick={() => handlePaymentSelection('cash')}
                      >
                        💵 Cash
                      </div>
                      <div
                        className={`payment-option ${paymentMethod === 'card' ? 'active' : ''}`}
                        onClick={() => handlePaymentSelection('card')}
                      >
                        💳 Card
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {paymentSuccess && (
                  <div className="payment-success">
                    <CheckCircle size={48} color="#10b981" />
                    <h3>Payment Successful!</h3>
                    <p>Receipt printed</p>
                  </div>
                )}

                {/* Receipt Preview - Compact */}
                {paymentMethod && (
                  <div className="receipt-preview">
                    <div className="receipt-header">
                      <h3>FASHION STORE</h3>
                      <div className="receipt-date">
                        {currentDateTime.date} {currentDateTime.time}
                      </div>
                      <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '4px' }}>
                        PAN: 623989429
                      </div>
                    </div>
                    <div className="receipt-items">
                      {cart.slice(-3).map(item => ( // Show last 3 items
                        <div key={item.id} className="receipt-item">
                          <span>{item.name.substring(0, 20)} x{item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {cart.length > 3 && (
                        <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-light)', padding: '4px' }}>
                          +{cart.length - 3} more items
                        </div>
                      )}
                    </div>
                    <div className="receipt-divider"></div>
                    <div className="receipt-total">
                      <span>TOTAL</span>
                      <span>${finalTotal.toFixed(2)}</span>
                    </div>
                    <div className="receipt-total">
                      <span>{paymentMethod === 'cash' ? '💵 CASH' : '💳 CARD'}</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>PAID</span>
                    </div>
                    <div className="receipt-footer">
                      ✓ Receipt Ready
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="totals-section">
                  <div className="total-row">
                    <span>Subtotal ({cartCount} items)</span>
                    <span className="total-amount">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span>Tax (0%)</span>
                    <span className="total-amount">$0.00</span>
                  </div>
                  <div className="total-row final">
                    <span>Total Amount</span>
                    <span className="total-amount">${finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                {!paymentSuccess && (
                  <button 
                    onClick={handleCheckout} 
                    className="btn-checkout"
                    disabled={cart.length === 0 || !paymentMethod}
                  >
                    <Printer size={20} />
                    {paymentMethod ? 'Proceed to Payment' : 'Select Payment Method'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Receipt for Printing - Hidden from UI, visible only when printing */}
      <div ref={receiptRef} id="print-receipt" style={{ display: 'none' }}>
        <div style={{ width: '320px', padding: '24px', fontFamily: 'Courier New, monospace', background: 'white' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ marginBottom: '8px' }}>FASHION STORE</h2>
            <p style={{ fontSize: '11px', marginBottom: '4px' }}>123 Fashion Street, Mall Road</p>
            <p style={{ fontSize: '11px' }}>Tel: +1-234-567-8900</p>
            <p style={{ fontSize: '10px', marginTop: '4px', fontWeight: '700' }}>PAN: 623989429</p>
          </div>
            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', marginBottom: '2px' }}>Receipt #: {currentDateTime.receiptNo}</p>
            <p style={{ fontSize: '11px', marginBottom: '2px' }}>Date: {currentDateTime.date} {currentDateTime.time}</p>
            <p style={{ fontSize: '11px' }}>Cashier: {user ? `${user.firstName} ${user.lastName}` : 'Admin Cashier'}</p>
            {customerName && <p style={{ fontSize: '11px' }}>Customer: {customerName}</p>}
          </div>
          {cart.map(item => (
            <div key={item.id} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>{item.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', paddingLeft: '8px' }}>
                <span>{item.quantity} x ${item.price.toFixed(2)}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #000', marginTop: '10px', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>Subtotal:</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>Tax (0%):</span>
              <span>$0.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #000' }}>
              <span>TOTAL:</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #000' }}>
            <p style={{ fontSize: '11px', marginBottom: '4px' }}>Payment: {paymentMethod === 'cash' ? 'Cash' : 'Card'}</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '8px' }}>Thank You!</p>
            <p style={{ fontSize: '10px', marginTop: '4px' }}>Please visit again!</p>
          </div>
        </div>
      </div>
    </div>
  )
}