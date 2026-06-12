import { useEffect, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import { loadCart, addToCartDB, updateCartQuantityDB } from './lib/cart'
import Login from './components/Login'
import ProductCard from './components/ProductCard'
import ShoppingCart from './components/ShoppingCart'
import Checkout from './components/Checkout'
import OrderHistory from './components/OrderHistory'
import AdminDashboard from './components/AdminDashboard'
import AdminRoute from './components/AdminRoute'
import ChatBox from './components/ChatBox'

const showClosableToast = (message, type, icon, duration = 3000) => {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
  
  toast.custom((t) => (
    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] max-w-md animate-slideInRight`}>
      <span className="text-xl">{icon}</span>
      <span className="flex-1 text-sm">{message}</span>
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="ml-2 text-white hover:text-gray-200 text-lg font-bold"
      >
        ✕
      </button>
    </div>
  ), { duration })
}

function App() {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [cartLoading, setCartLoading] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) {
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setCart([])
          setIsAdmin(false)
          setShowOrderHistory(false)
          setShowAdminDashboard(false)
          setShowCheckout(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (authId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id_auth_link', authId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user:', error)
      showClosableToast('Failed to load profile', 'error', '❌', 3000)
    } else if (data) {
      setUser(data)
      setIsAdmin(data.role === 'admin')
      await loadUserCart(data.id)
    }
  }

  const loadUserCart = async (userId) => {
    setCartLoading(true)
    const cartItems = await loadCart(userId)
    setCart(cartItems)
    setCartLoading(false)
  }

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Error fetching products:', error)
        showClosableToast('Failed to load products', 'error', '❌', 3000)
      } else {
        setProducts(data || [])
      }
      setLoading(false)
    }
    
    fetchProducts()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCart([])
    setUser(null)
    setIsAdmin(false)
    setShowOrderHistory(false)
    setShowAdminDashboard(false)
    setShowCheckout(false)
    showClosableToast('Logged out successfully', 'success', '👋', 3000)
  }

  const addToCart = async (product) => {
    if (!user) {
      showClosableToast('Please login first', 'error', '🔐', 3000)
      return
    }
    
    try {
      const currentItem = cart.find(item => item.id === product.id)
      const currentQty = currentItem?.quantity || 0
      
      const newQuantity = await addToCartDB(user.id, product, currentQty)
      
      setCart(prevCart => {
        const existing = prevCart.find(item => item.id === product.id)
        if (existing) {
          showClosableToast(`Added another ${product.name}! (Total: ${newQuantity})`, 'success', '🛒', 2500)
          return prevCart.map(item =>
            item.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          )
        }
        
        showClosableToast(`${product.name} added to cart!`, 'success', '🛒', 2500)
        return [...prevCart, { ...product, quantity: 1 }]
      })
    } catch (error) {
      showClosableToast('Failed to add to cart', 'error', '❌', 3000)
    }
  }

  const updateQuantity = async (productId, newQuantity) => {
    if (!user) return
    
    const product = cart.find(item => item.id === productId)
    
    try {
      await updateCartQuantityDB(user.id, productId, newQuantity)
      
      if (newQuantity <= 0) {
        showClosableToast(`Removed ${product?.name} from cart`, 'error', '🗑️', 2000)
        setCart(prev => prev.filter(item => item.id !== productId))
      } else {
        const change = newQuantity - (product?.quantity || 0)
        if (change > 0) {
          showClosableToast(`Added another ${product?.name}`, 'success', '➕', 1500)
        } else if (change < 0) {
          showClosableToast(`Removed one ${product?.name}`, 'warning', '➖', 1500)
        }
        setCart(prev => prev.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        ))
      }
    } catch (error) {
      showClosableToast('Failed to update cart', 'error', '❌', 3000)
    }
  }

  const removeItem = async (productId) => {
    if (!user) return
    
    const product = cart.find(item => item.id === productId)
    
    try {
      await updateCartQuantityDB(user.id, productId, 0)
      
      showClosableToast(`Removed ${product?.name} from your cart`, 'error', '🗑️', 2000)
      setCart(prev => prev.filter(item => item.id !== productId))
    } catch (error) {
      showClosableToast('Failed to remove item', 'error', '❌', 3000)
    }
  }

  const handleCheckout = () => {
    if (!user) {
      showClosableToast('Please login first', 'error', '🔐', 3000)
      return
    }
    if (cart.length === 0) {
      showClosableToast('Your cart is empty! Add some items first.', 'warning', '🍽️', 3000)
      return
    }
    setShowCheckout(true)
  }

  const handleOrderPlaced = (order) => {
    setCart([])
    showClosableToast(`Order #${order.id} placed! Total: $${order.total_amount.toFixed(2)}`, 'success', '🎉', 5000)
  }

  const goToOrderHistory = () => {
    if (!user) {
      showClosableToast('Please login first', 'error', '🔐', 3000)
      return
    }
    setShowOrderHistory(true)
    setShowAdminDashboard(false)
    setIsMobileMenuOpen(false)
  }

  const goBackToMenu = () => {
    setShowOrderHistory(false)
    setShowAdminDashboard(false)
  }

  const goToAdminDashboard = () => {
    if (!user) {
      showClosableToast('Please login first', 'error', '🔐', 3000)
      return
    }
    setShowAdminDashboard(true)
    setShowOrderHistory(false)
    setIsMobileMenuOpen(false)
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-0">
      <Toaster 
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            padding: '0',
            margin: '0',
            background: 'transparent',
            boxShadow: 'none',
          },
        }}
      />
      
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-30 animate-slideDown">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-bold text-orange-600">🍽️ Omnichannel OMS</h1>
            <p className="text-xs md:text-sm text-gray-500 hidden sm:block">Food Ordering System</p>
          </div>
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition duration-200"
          >
            <span className="text-xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
          </button>
          
          <div className="hidden md:flex items-center gap-4">
            {isAdmin && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded animate-pulse">
                👑 Admin
              </span>
            )}
            <span className="text-sm text-gray-600">
              Welcome, {user?.full_name || session.user.email.split('@')[0]}!
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200 transform hover:scale-105"
            >
              Logout
            </button>
          </div>
        </div>
        
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t p-4 space-y-3 animate-slideDown">
            <p className="text-sm text-gray-600">
              Welcome, {user?.full_name || session.user.email.split('@')[0]}!
            </p>
            {isAdmin && (
              <p className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded inline-block">
                👑 Admin
              </p>
            )}
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 md:py-8 animate-fadeIn">
        {showAdminDashboard ? (
          <AdminRoute>
            <AdminDashboard onBack={goBackToMenu} />
          </AdminRoute>
        ) : showOrderHistory ? (
          <OrderHistory user={user} onBack={goBackToMenu} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-1">Our Menu 🍕</h2>
                <p className="text-sm md:text-base text-gray-600">Delicious food made fresh for you!</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={goToOrderHistory}
                  className="flex-1 sm:flex-none bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 md:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition duration-200 transform hover:scale-105 text-sm md:text-base"
                >
                  📋 Orders
                </button>
                {isAdmin && (
                  <button
                    onClick={goToAdminDashboard}
                    className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition duration-200 transform hover:scale-105 text-sm md:text-base"
                  >
                    👑 Admin
                  </button>
                )}
              </div>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {[1,2,3,4,5,6,7,8].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="h-40 sm:h-48 bg-gray-200 skeleton"></div>
                    <div className="p-3 sm:p-4">
                      <div className="h-5 bg-gray-200 rounded skeleton mb-2"></div>
                      <div className="h-10 bg-gray-200 rounded skeleton mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded skeleton"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {products.map((product, index) => (
                  <div key={product.id} className="animate-fadeIn" style={{ animationDelay: `${index * 0.05}s` }}>
                    <ProductCard product={product} onAddToCart={addToCart} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ShoppingCart 
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={handleCheckout}
        loading={cartLoading}
      />

      {showCheckout && (
        <Checkout
          cart={cart}
          user={user}
          onClose={() => setShowCheckout(false)}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {session && user && user.role !== 'admin' && (
        <ChatBox 
          userId={user?.id} 
          userName={user?.full_name}
          userRole={user?.role}
        />
      )}
    </div>
  )
}

export default App