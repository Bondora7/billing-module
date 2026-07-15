import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Search, ShoppingCart, LogOut, X, Printer, CheckCircle, Wifi, WifiOff, Loader2 } from 'lucide-react'
import api from '../utils/api'
import ProductImage from '../components/ProductImage'
import { useDebounce } from '../hooks/useDebounce'

const Dashboard = forwardRef(function Dashboard({ user, onLogout }, ref) {
  const [categories, setCategories] = useState([{ _id: 'all', name: 'All' }])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    total: 0,
  })
  const [purchases, setPurchases] = useState([])
  const [searchInput, setSearchInput] = useState('')

  // Create debounced version of search input (500ms delay)
  const debouncedSearchTerm = useDebounce(searchInput, 500)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [printerStatus, setPrinterStatus] = useState('online')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [customerDiscountType, setCustomerDiscountType] = useState('')
  const [customerDiscountValue, setCustomerDiscountValue] = useState('')
  const [apiError, setApiError] = useState('')
  const [purchaseResult, setPurchaseResult] = useState(null)
  const [alert, setAlert] = useState({ show: false, message: '', type: 'error' })
  const receiptRef = useRef(null)
  const productGridRef = useRef(null)

  // Track previous categories to prevent unnecessary updates
  const prevCategoriesRef = useRef(categories)

  // Helper function to remove bracket values from category names
  const cleanCategoryName = (name) => {
    return name.replace(/\s*\([^)]*\)/g, '').trim()
  }

  // Reusable function to fetch categories
  const refreshCategories = async () => {
    try {
      setCategoriesLoading(true)
      setCategoriesError('')
      const response = await api.get('/categories')
      const categoriesData = response.data

      // Clean category names by removing bracket values
      const cleanedCategories = categoriesData.map(cat => ({
        ...cat,
        name: cleanCategoryName(cat.name)
      }))

      // Prepend "All" category to the fetched categories
      const allCategories = [{ _id: 'all', name: 'All' }, ...cleanedCategories]

      // Only update state if categories actually changed
      const prevIds = prevCategoriesRef.current.map(c => c._id).join(',')
      const newIds = allCategories.map(c => c._id).join(',')

      if (prevIds !== newIds) {
        prevCategoriesRef.current = allCategories
        setCategories(allCategories)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      setCategoriesError('Failed to load categories')
      // Keep default "All" category on error
      setCategories([{ _id: 'all', name: 'All' }])
    } finally {
      setCategoriesLoading(false)
    }
  }

  // Expose refreshCategories function to parent components
  useImperativeHandle(ref, () => ({
    refreshCategories
  }))

  // Fetch categories on component mount
  useEffect(() => {
    refreshCategories()
  }, [])

  // Track previous products to prevent unnecessary updates
  const prevProductsRef = useRef([])
  const [hasProductsLoaded, setHasProductsLoaded] = useState(false)

  // Fetch products when debounced search term or category changes
  useEffect(() => {
    // Skip if search term and category haven't changed
    const prevSearchTerm = prevProductsRef.current.searchTerm || ''
    const prevCategory = prevProductsRef.current.category || 'All'

    if (prevSearchTerm === debouncedSearchTerm &&
      prevCategory === selectedCategory &&
      hasProductsLoaded) {
      return
    }

    const fetchProducts = async () => {
      try {
        // Always show loading state during fetch
        setProductsLoading(true)
        setProductsError('')

        // Don't clear existing products until new ones arrive (prevents flickering)
        setPagination({
          currentPage: 1,
          totalPages: 0,
          hasNextPage: false,
          total: 0,
        })

        const params = {
          page: 1,
          limit: 10,
        }

        // Add productCode only if search term exists
        if (debouncedSearchTerm.trim()) {
          params.productCode = debouncedSearchTerm.trim()
        }

        // Add categoryId only if a specific category is selected (not "All")
        if (selectedCategory !== 'All') {
          const selectedCat = categories.find(cat => cat.name === selectedCategory)
          if (selectedCat && selectedCat._id !== 'all') {
            params.categoryId = selectedCat._id
          }
        }

        const response = await api.get('/products/search', { params })
        const { products: productsData, pagination: paginationData } = response.data

        // Check if products actually changed before updating state
        const prevProductIds = prevProductsRef.current.products?.map(p => p._id).join(',') || ''
        const newProductIds = productsData.map(p => p._id).join(',')

        if (prevProductIds !== newProductIds || !hasProductsLoaded) {
          setProducts(productsData)
          setPagination(paginationData)
          setHasProductsLoaded(true)
        }

        // Store current search params for next comparison
        prevProductsRef.current = {
          searchTerm: debouncedSearchTerm,
          category: selectedCategory,
          products: productsData
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
        setProductsError('Failed to load products')
        // Only clear products on error if we've loaded before
        if (hasProductsLoaded) {
          setProducts([])
        }
      } finally {
        setProductsLoading(false)
      }
    }

    fetchProducts()
  }, [debouncedSearchTerm, selectedCategory, categories, hasProductsLoaded])

  // Load more products for infinite scroll
  const loadMoreProducts = async () => {
    if (loadingMore || !pagination.hasNextPage) return

    try {
      setLoadingMore(true)
      const nextPage = pagination.currentPage + 1

      const params = {
        page: nextPage,
        limit: 10,
      }

      if (debouncedSearchTerm.trim()) {
        params.productCode = debouncedSearchTerm.trim()
      }

      if (selectedCategory !== 'All') {
        const selectedCat = categories.find(cat => cat.name === selectedCategory)
        if (selectedCat && selectedCat._id !== 'all') {
          params.categoryId = selectedCat._id
        }
      }

      const response = await api.get('/products/search', { params })
      const { products: newProducts, pagination: newPagination } = response.data

      setProducts([...products, ...newProducts])
      setPagination(newPagination)
    } catch (err) {
      console.error('Failed to load more products:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!productGridRef.current) return

      const { scrollTop, scrollHeight, clientHeight } = productGridRef.current
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

      if (scrollPercentage > 0.8 && pagination.hasNextPage && !loadingMore && !productsLoading) {
        loadMoreProducts()
      }
    }

    const gridElement = productGridRef.current
    if (gridElement) {
      gridElement.addEventListener('scroll', handleScroll)
      return () => gridElement.removeEventListener('scroll', handleScroll)
    }
  }, [pagination.hasNextPage, loadingMore, productsLoading, products])

  const addToCart = (product, qty = 1) => {
    const availableStock = getProductStock(product)
    
    if (availableStock === 0) {
      showAlert('No stock available', 'error')
      return
    }
    
    const existing = cart.find(item => item._id === product._id)
    if (existing) {
      const currentQty = existing.quantity
      if (currentQty + qty > availableStock) {
        showAlert(`Only ${availableStock} items available in stock`, 'error')
        return
      }
      
      setCart(cart.map(item =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ))
    } else {
      if (qty > availableStock) {
        showAlert(`Only ${availableStock} items available in stock`, 'error')
        return
      }
      
      setCart([...cart, {
        ...product,
        quantity: qty,
        id: product._id, // For compatibility with existing cart logic
      }])
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
    
    const cartItem = cart.find(item => item.id === id)
    if (cartItem) {
      const product = products.find(p => p._id === id)
      const availableStock = product ? getProductStock(product) : 0
      
      // Check if trying to increase quantity beyond available stock
      if (qty > cartItem.quantity && qty > availableStock) {
        showAlert(`Only ${availableStock} items available in stock`, 'error')
        return
      }
    }
    
    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity: qty } : item
    ))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const tax = cartTotal * 0.0
  const discountAmount = customerDiscountType && customerDiscountValue
    ? (customerDiscountType === 'percentage'
      ? (cartTotal * parseFloat(customerDiscountValue) / 100)
      : parseFloat(customerDiscountValue))
    : 0
  const totalWithoutDiscount = cartTotal + tax
  const totalAfterDiscount = Math.max(0, totalWithoutDiscount - discountAmount)
  const finalTotal = totalAfterDiscount

  const getCurrentDateTime = () => {
    const now = new Date()
    return {
      date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      receiptNo: Math.floor(Math.random() * 90000) + 10000
    }
  }

  const currentDateTime = getCurrentDateTime()

  const getProductStock = (product) => {
    return product.quantity || product.stock || product.stockQuantity || product.availableStock || 0
  }

  const handlePaymentSelection = (method) => {
    // Only allow 'cash' or 'online' payment methods
    if (method === 'cash' || method === 'online') {
      setPaymentMethod(method)
      setPaymentSuccess(false)
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (!paymentMethod) return
    if (customerDiscountType && !customerDiscountValue) return

    setPrinterStatus('printing')
    setApiError('')

    try {
      // Prepare purchase data for API
      const purchaseData = {
        products: cart.map(item => ({
          productCode: item.productCode || item.sku || 'N/A',
          quantity: item.quantity,
        })),
        paymentMethod: paymentMethod,
        customerName: customerName || 'Walk-in Customer',
        purchasedByName: user ? `${user.firstName} ${user.lastName}` : 'Admin Cashier',
        notes: '',
        ...(customerDiscountType && customerDiscountValue && {
          customerDiscountType: customerDiscountType,
          customerDiscountValue: parseFloat(customerDiscountValue),
        }),
      }

      // Call backend API
      const response = await api.post('/billing/purchase', purchaseData, {
        params: {
          userId: user?._id || '',
          userRole: user?.role || 'BILLING',
        },
      })

      const purchaseResult = response.data

      // Store purchase result for receipt display
      setPurchaseResult(purchaseResult)

      // Update printer status to online after successful API call
      setPrinterStatus('online')
      setPaymentSuccess(true)

      // Add to purchases history with full details
      const newPurchase = {
        id: Date.now(),
        transactionId: purchaseResult.transactionId,
        receiptNo: purchaseResult.receiptNo,
        customerName: purchaseResult.customerName,
        items: cart,
        subtotal: purchaseResult.totalAmountWithoutDiscount,
        discountAmount: purchaseResult.discountAmount || 0,
        discountType: customerDiscountType,
        total: purchaseResult.totalAmount,
        paymentMethod: purchaseResult.paymentMethod,
        date: currentDateTime.date,
        time: currentDateTime.time,
        createdAt: purchaseResult.createdAt,
      }
      setPurchases([newPurchase, ...purchases])

      // Show success message with low stock warnings if any
      if (purchaseResult.lowStockWarnings && purchaseResult.lowStockWarnings.length > 0) {
        console.warn('Low stock warnings:', purchaseResult.lowStockWarnings)
      }

      // Refetch products to update stock quantities
      refetchProducts()

      // Don't clear cart immediately, let user see success
      setTimeout(() => {
        setCart([])
        setCustomerName('')
        setPaymentMethod('')
        setCustomerDiscountType('')
        setCustomerDiscountValue('')
        setPaymentSuccess(false)
        setPurchaseResult(null)
      }, 3000)
    } catch (err) {
      console.error('Failed to create purchase:', err)
      setPrinterStatus('online')
      setApiError(err.response?.data?.message || 'Failed to process payment. Please try again.')
    }
  }

  const printReceipt = () => {
    // Focus the print content and trigger print
    window.print()
  }

  const refetchProducts = async () => {
    try {
      setProductsLoading(true)
      setProductsError('')

      const params = {
        page: 1,
        limit: 10,
      }

      if (debouncedSearchTerm.trim()) {
        params.productCode = debouncedSearchTerm.trim()
      }

      if (selectedCategory !== 'All') {
        const selectedCat = categories.find(cat => cat.name === selectedCategory)
        if (selectedCat && selectedCat._id !== 'all') {
          params.categoryId = selectedCat._id
        }
      }

      const response = await api.get('/products/search', { params })
      const { products: productsData, pagination: paginationData } = response.data
      setProducts(productsData)
      setPagination(paginationData)
      setHasProductsLoaded(true)

      prevProductsRef.current = {
        searchTerm: debouncedSearchTerm,
        category: selectedCategory,
        products: productsData
      }
    } catch (err) {
      console.error('Failed to refetch products:', err)
    } finally {
      setProductsLoading(false)
    }
  }

  const showAlert = (message, type = 'error') => {
    setAlert({ show: true, message, type })
    setTimeout(() => {
      setAlert({ show: false, message: '', type })
    }, 3000)
  }

  return (
    <div className="dashboard">
      {/* Custom Alert Toast */}
      {alert.show && (
        <div className={`alert-toast alert-${alert.type}`}>
          <div className="alert-icon">
            {alert.type === 'error' ? '⚠️' : '✓'}
          </div>
          <div className="alert-message">{alert.message}</div>
          <button className="alert-close" onClick={() => setAlert({ ...alert, show: false })}>×</button>
        </div>
      )}
      
      <div className="pos-container">
        {/* Left Side - Product Selection */}
        <div className="pos-left">
          {/* Top Header */}
          <div className="pos-header">
            <div className="pos-header-top">
              <div className="pos-brand">
                <ShoppingCart size={26} />
                <h1>Bondora Billing Module</h1>
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
              <div className="search-form">
                <div className="search-bar">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search by product code..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="category-tabs">
              {categoriesLoading ? (
                <div className="categories-loading">
                  <Loader2 size={18} className="loading-spinner" />
                  <span>Loading categories...</span>
                </div>
              ) : categoriesError ? (
                <div className="categories-error">{categoriesError}</div>
              ) : (
                categories.map(cat => (
                  <button
                    key={cat._id}
                    className={`category-tab ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    {cat.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="product-grid" ref={productGridRef}>
            {productsLoading && products.length === 0 ? (
              <div className="products-loading">
                <Loader2 size={48} className="loading-spinner-large" />
                <p>Loading products...</p>
              </div>
            ) : productsError ? (
              <div className="products-error">
                <p>{productsError}</p>
                <button className="btn-retry" onClick={() => window.location.reload()}>Retry</button>
              </div>
            ) : products.length === 0 && hasProductsLoaded ? (
              <div className="empty-state">
                <Search size={48} />
                <h3>No Products Found</h3>
                <p>Try adjusting your search or category filter</p>
              </div>
            ) : products.length === 0 && !hasProductsLoaded ? (
              <div className="products-loading">
                <Loader2 size={48} className="loading-spinner-large" />
                <p>Loading products...</p>
              </div>
            ) : (
              <>
                {products.map(product => (
                  <div
                    key={product._id}
                    className="product-card"
                    onClick={() => addToCart(product)}
                  >
                    <div className="product-image">
                      <ProductImage
                        src={product.primaryImage || product.images?.[0]}
                        alt={product.name}
                      />
                    </div>
                    <div className="product-info">
                      <div className="product-name">{product.name}</div>
                      <div className="product-sku">{product.productCode || product.sku || 'N/A'}</div>
                      {product.brandName && (
                        <div className="product-brand">{product.brandName}</div>
                      )}
                      <div className={`product-stock ${getProductStock(product) === 0 ? 'out-of-stock' : ''}`}>
                        Stock: {getProductStock(product)}
                      </div>
                    </div>
                    <div className="product-footer">
                      <div className="product-price">Rs. {product.price.toFixed(2)}</div>
                      <button 
                        className="add-btn" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const stock = getProductStock(product)
                          if (stock === 0) {
                            showAlert('No stock available', 'error')
                          } else {
                            addToCart(product);
                          }
                        }}
                        disabled={getProductStock(product) === 0}
                        style={getProductStock(product) === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                {loadingMore && (
                  <div className="loading-more">
                    <Loader2 size={24} className="loading-spinner" />
                    <span>Loading more...</span>
                  </div>
                )}
                {!pagination.hasNextPage && products.length > 0 && !loadingMore && (
                  <div className="no-more-products">
                    <p>All products loaded</p>
                  </div>
                )}
              </>
            )}
          </div>
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
              {/* Cart Items - Scrollable List */}
              <div className="cart-items">
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  padding: '0 4px'
                }}>
                  Cart Items ({cart.length} total)
                </div>
                {cart.map((item, index) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-header">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">
                        Rs. {(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '6px' }}>
                      Rs. {item.price.toFixed(2)} each
                    </div>
                    <div className="cart-item-footer">
                      <div className="cart-item-actions">
                        <button
                          className="qty-btn"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="qty-display">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="btn-remove"
                        onClick={() => removeFromCart(item.id)}
                        title="Remove item"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
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
                        className={`payment-option ${paymentMethod === 'online' ? 'active' : ''}`}
                        onClick={() => handlePaymentSelection('online')}
                      >
                        💳 Online
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Discount */}
                {!paymentSuccess && paymentMethod && (
                  <div className="discount-section">
                    <label>Customer Discount (Optional)</label>
                    <div className="discount-type-options">
                      <div
                        className={`discount-type-option ${customerDiscountType === 'flat' ? 'active' : ''}`}
                        onClick={() => setCustomerDiscountType(customerDiscountType === 'flat' ? '' : 'flat')}
                      >
                        Flat (Rs.)
                      </div>
                      <div
                        className={`discount-type-option ${customerDiscountType === 'percentage' ? 'active' : ''}`}
                        onClick={() => setCustomerDiscountType(customerDiscountType === 'percentage' ? '' : 'percentage')}
                      >
                        Percentage (%)
                      </div>
                    </div>
                    {customerDiscountType && (
                      <input
                        type="number"
                        className="discount-input"
                        placeholder={customerDiscountType === 'flat' ? 'Enter discount amount (Rs.)' : 'Enter discount percentage (%)'}
                        value={customerDiscountValue}
                        onChange={(e) => setCustomerDiscountValue(e.target.value)}
                        min="0"
                        max={customerDiscountType === 'percentage' ? '100' : undefined}
                      />
                    )}
                  </div>
                )}

                {/* API Error Message */}
                {apiError && (
                  <div className="api-error">
                    <p>{apiError}</p>
                    <button onClick={() => setApiError('')}>Dismiss</button>
                  </div>
                )}

                {/* Success Message */}
                {paymentSuccess && (
                  <div className="payment-success">
                    <CheckCircle size={48} color="#10b981" />
                    <h3>Payment Successful!</h3>
                    <p>Receipt printed</p>
                    <button className="btn-print-receipt" onClick={printReceipt}>
                      <Printer size={18} />
                      Print Receipt
                    </button>
                  </div>
                )}

                {/* Receipt Preview - Show when items in cart */}
                {cart.length > 0 && (
                  <div className="receipt-preview thermal-preview">
                    <div className="bill-center">
                      <div className="shop-name">Bondora</div>
                      <div>Nikosera, Bhaktapur</div>
                      <div>Tel: 9713840508</div>
                      <br />
                      <strong>ESTIMATION</strong>
                      <div>(This is not a Tax Invoice.)</div>
                    </div>
                    <br />
                    <div>Date: {currentDateTime.date}</div>
                    <div>Area: Nikosera, Bhaktapur</div>
                    <hr />
                    <div className="bill-heading">
                      <span>Item</span>
                      <span>Qty</span>
                      <span>Rate</span>
                      <span>Amt</span>
                    </div>
                    <hr />
                    {cart.map(item => (
                      <div key={item.id} className="bill-row">
                        <span>{item.name}</span>
                        <span>{item.quantity}</span>
                        <span>{item.price.toFixed(0)}</span>
                        <span>{(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    <hr />
                    <div className="bill-total">
                      <span>Total Items ({cartCount})</span>
                      <span>Rs. {cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="bill-total">
                      <span>Sub Total</span>
                      <span>Rs. {cartTotal.toFixed(2)}</span>
                    </div>
                    {customerDiscountType && customerDiscountValue && (
                      <>
                        <div className="bill-total">
                          <span>Total (Before Discount)</span>
                          <span>Rs. {totalWithoutDiscount.toFixed(2)}</span>
                        </div>
                        <div className="bill-total">
                          <span>Discount ({customerDiscountType === 'percentage' ? `${customerDiscountValue}%` : 'Flat'})</span>
                          <span>-Rs. {discountAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="bill-total">
                      <strong>Total {customerDiscountType && customerDiscountValue ? '(With Discount)' : ''}</strong>
                      <strong>Rs. {finalTotal.toFixed(2)}</strong>
                    </div>
                    <div className="bill-total">
                      <span>Remaining Total</span>
                      <span>Rs. {finalTotal.toFixed(2)}</span>
                    </div>
                    <hr />
                    <div className="bill-total">
                      <span>Due Amount</span>
                      <span>Rs. 0.00</span>
                    </div>
                    <br />
                    <div>Counter: Bode Planning </div>
                    <div>Cashier: {user ? `${user.firstName} ${user.lastName}` : "Cashier"}</div>
                    <br />
                    <div className="bill-center">
                      <strong>*** Not a Tax Invoice ***</strong>
                      <div>Products once sold can only be exchanged.</div>
                      <br />
                      <div>Thank you for visiting us.</div>
                    </div>
                    {paymentMethod && !paymentSuccess && (
                      <div style={{ textAlign: 'center', marginTop: '10px', padding: '8px', background: '#fef3c7', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                        Preview - Select payment method to proceed
                      </div>
                    )}
                  </div>
                )}


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

      {/* Receipt for Printing - Thermal Printer (80mm for POS-80) */}
      <div
        ref={receiptRef}
        id="print-receipt"
        style={{
          width: "80mm",
          fontFamily: "'Courier New', monospace",
          fontSize: "11px",
          padding: "2mm 4mm",
          background: "#fff",
          color: "#000",
          lineHeight: "1.3",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "normal",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold" }}>Bondora</div>
          <div>Nikosera, Bhaktapur</div>
          <div>Tel: 9713840508</div>
          <div style={{ fontWeight: "bold", marginTop: "4px" }}>ESTIMATION</div>
          <div style={{ fontSize: "9px" }}>(This is not a Tax Invoice.)</div>
        </div>

        <div style={{ marginBottom: "4px" }}>
          <div>Date: {currentDateTime.date}</div>
          <div>Area: Nikosera, Bhaktapur</div>
          <div>Receipt No: {purchaseResult?.receiptNo}</div>
        </div>

        <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "3px 0" }} />

        <table style={{ width: "100%", fontSize: "10px", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left" style={{ width: "45%", padding: "1px 0" }}>Item</th>
              <th align="center" style={{ width: "15%", padding: "1px 0" }}>QTY</th>
              <th align="right" style={{ width: "20%", padding: "1px 0" }}>Rate</th>
              <th align="right" style={{ width: "20%", padding: "1px 0" }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.id}>
                <td align="left" style={{ wordBreak: "break-word", padding: "1px 0" }}>{item.name}</td>
                <td align="center" style={{ padding: "1px 0" }}>{item.quantity}</td>
                <td align="right" style={{ padding: "1px 0" }}>{item.price.toFixed(0)}</td>
                <td align="right" style={{ padding: "1px 0" }}>
                  {(item.price * item.quantity).toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "3px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", margin: "1px 0" }}>
          <span>Total Items ({cartCount}) :</span>
          <span>Rs.{cartTotal.toFixed(2)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", margin: "1px 0" }}>
          <span>Sub Total :</span>
          <span>Rs.{cartTotal.toFixed(2)}</span>
        </div>

        {customerDiscountType && customerDiscountValue && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "1px 0" }}>
              <span>Before Discount :</span>
              <span>Rs.{totalWithoutDiscount.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "1px 0" }}>
              <span>Discount{customerDiscountType === 'percentage' ? `(${customerDiscountValue}%)` : ''} :</span>
              <span>-Rs.{discountAmount.toFixed(2)}</span>
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", margin: "1px 0", fontWeight: "bold" }}>
          <span>Total{customerDiscountType && customerDiscountValue ? '(With Disc.)' : ''} :</span>
          <span>Rs.{finalTotal.toFixed(2)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", margin: "1px 0" }}>
          <span>Remaining Total :</span>
          <span>Rs.{finalTotal.toFixed(2)}</span>
        </div>

        <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "3px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", margin: "1px 0" }}>
          <span>Due Amount :</span>
          <span>Rs.0.00</span>
        </div>

        <div style={{ marginTop: "4px" }}>
          <div>Counter: Bode Planning</div>
          <div>Cashier: {user ? `${user.firstName} ${user.lastName}` : "Cashier"}</div>
        </div>

        <div style={{ textAlign: "center", marginTop: "4px", fontSize: "9px" }}>
          *** Not a Tax Invoice ***
          <br />
          Products once sold can only be exchanged.
          <br />
          Thank you for visiting us.
        </div>
      </div>
    </div>
  )
})

export default Dashboard