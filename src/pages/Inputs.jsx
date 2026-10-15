import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { inputProductsAPI, inputOrdersAPI, paymentsAPI } from '../api/client';
import { useAuth } from '../shared/context/AuthContext';
import Loading from '../components/Loading/Loading';
import './CSS/Inputs.css';

const CATEGORIES = [
  { value: 'all', label: 'Pembejeo Zote', icon: 'fas fa-th-large' },
  { value: 'seeds', label: 'Mbegu', icon: 'fas fa-seedling' },
  { value: 'fertilizers', label: 'Mbolea', icon: 'fas fa-flask' },
  { value: 'pesticides', label: 'Dawa za Wadudu', icon: 'fas fa-bug' },
  { value: 'tools', label: 'Vifaa', icon: 'fas fa-wrench' },
  { value: 'irrigation', label: 'Umwagiliaji', icon: 'fas fa-droplet' },
];

const CATEGORY_FALLBACKS = {
  seeds: 'fas fa-seedling',
  fertilizers: 'fas fa-flask',
  pesticides: 'fas fa-bug',
  tools: 'fas fa-wrench',
  irrigation: 'fas fa-droplet',
  other: 'fas fa-box',
};

const Inputs = () => {
  const { user } = useAuth();
  // Buying inputs is a buyer/farmer action (browsing is open to everyone).
  const canBuy = user?.role === 'buyer' || user?.role === 'farmer';
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kataviInputCart') || '[]'); } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [cartToast, setCartToast] = useState(null);
  const [addedIds, setAddedIds] = useState({});

  useEffect(() => { localStorage.setItem('kataviInputCart', JSON.stringify(cart)); }, [cart]);

  const flashAdded = (productId) => {
    setAddedIds(prev => ({ ...prev, [productId]: true }));
    setTimeout(() => setAddedIds(prev => ({ ...prev, [productId]: false })), 1500);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (sortBy) params.sort = sortBy;
      const res = await inputProductsAPI.getAll(params);
      setProducts(res.data);
    } catch (err) {
      console.error('Fetch input products error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addToCart = (product) => {
    const qty = Number(quantities[product._id]) || 1;
    if (qty < 1) return;
    if (qty > product.stockQuantity) {
      alert(`Kiasi hakitoshi. Inapatikana: ${product.stockQuantity} ${product.unit}`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stockQuantity) {
          alert(`Kiasi hakitoshi. Inapatikana: ${product.stockQuantity} ${product.unit}`);
          return prev;
        }
        return prev.map(i => i._id === product._id ? { ...i, quantity: newQty } : i);
      }
      return [...prev, {
        _id: product._id, name: product.name, price: product.price,
        unit: product.unit, image: product.image, quantity: qty,
        category: product.category, supplierName: product.supplierName,
      }];
    });
    setQuantities(prev => ({ ...prev, [product._id]: 1 }));
    flashAdded(product._id);
    setCartToast(product.name);
  };

  useEffect(() => {
    if (!cartToast) return;
    const t = setTimeout(() => setCartToast(null), 2500);
    return () => clearTimeout(t);
  }, [cartToast]);

  const updateCartItem = (productId, qty) => {
    if (qty < 1) {
      setCart(prev => prev.filter(i => i._id !== productId));
      return;
    }
    setCart(prev => prev.map(i => i._id === productId ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i._id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!cart.length) return;

    const form = new FormData(e.target);
    const deliveryMethod = form.get('deliveryMethod') || 'pickup';
    const deliveryLocation = form.get('deliveryLocation') || '';
    const contact = form.get('contact') || user.phone || '';
    const paymentProvider = form.get('paymentProvider') || '';
    const paymentPhone = form.get('paymentPhone') || '';

    setOrderLoading(true);
    try {
      const items = cart.map(i => ({ product: i._id, productName: i.name, quantity: i.quantity }));
      const res = await inputOrdersAPI.create({
        items, deliveryMethod, deliveryLocation, contact,
        paymentProvider: paymentProvider || undefined,
        paymentPhone: paymentPhone || undefined,
      });
      setOrderSuccess(res.data.order);
      setCart([]);
      setCheckoutOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Hitilafu imetokea wakati wa kuweka agizo');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleImageError = (e, category) => {
    e.target.style.display = 'none';
    const fb = e.target.nextSibling;
    if (fb) fb.classList.remove('hidden');
  };

  const formatPrice = (p) => `TSh ${Number(p).toLocaleString()}`;

  if (loading && !products.length) return <Loading message="Inapakia pembejeo..." />;

  return (
    <div className="page inputs-page">
      {cartToast && (
        <div className="cart-toast" onClick={() => setCartToast(null)}>
          <i className="fas fa-check-circle"></i>
          <div>
            <strong>Imeongezwa kwenye kikapu!</strong>
            <span>{cartToast}</span>
          </div>
        </div>
      )}
      <div className="inputs-container">
        <div className="container">
          <div className="inputs-header">
            <h1>Pembejeo za Kilimo</h1>
            <p>Pata mbolea, mbegu na vifaa vyote vya kilimo kwa bei nafuu. Weka agizo na ulipe kwa M-Pesa.</p>
          </div>

          {/* Search & Sort */}
          <div className="inputs-controls">
            <div className="inputs-search">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Tafuta pembejeo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="inputs-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="createdAt">Mpya Zaidi</option>
              <option value="price_asc">Bei: Chini</option>
              <option value="price_desc">Bei: Juu</option>
              <option value="rating">Ukadiriaji</option>
              <option value="name">Jina</option>
            </select>
            {canBuy && (
              <button className="cart-toggle-btn" onClick={() => setCartOpen(!cartOpen)}>
                <i className="fas fa-shopping-cart"></i>
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="category-filters">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.value)}
              >
                <i className={cat.icon}></i> {cat.label}
              </button>
            ))}
          </div>

          {/* Error State */}
          {error && (
            <div className="inputs-error">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Huduma Haipatikani</h3>
              <p>Samahani, hatuwezi kupata bidhaa kwa sasa.</p>
              <button className="btn btn-primary" onClick={fetchProducts}>
                <i className="fas fa-sync-alt"></i> Jaribu Tena
              </button>
            </div>
          )}

          {/* Products Grid */}
          {!error && (
            <>
              {products.length === 0 ? (
                <div className="inputs-empty">
                  <i className="fas fa-box-open"></i>
                  <h3>Hakuna Bidhaa Zilizopatikana</h3>
                  <p>Badilisha utafutaji au chagua aina nyingine.</p>
                </div>
              ) : (
                <div className="inputs-grid">
                  {products.map(product => (
                    <div key={product._id} className="input-card">
                      <div className={`input-image-container ${product.category}`}>
                        {product.image ? (
                          <>
                            <img
                              className="input-image"
                              src={product.image}
                              alt={product.name}
                              onError={(e) => handleImageError(e, product.category)}
                            />
                            <div className="input-image-fallback hidden">
                              <i className={CATEGORY_FALLBACKS[product.category] || 'fas fa-box'}></i>
                            </div>
                          </>
                        ) : (
                          <div className="input-image-fallback">
                            <i className={CATEGORY_FALLBACKS[product.category] || 'fas fa-box'}></i>
                          </div>
                        )}
                      </div>

                      <div className="input-content">
                        <div className="input-category">{CATEGORIES.find(c => c.value === product.category)?.label || product.category}</div>
                        <h3 className="input-name">{product.name}</h3>
                        {product.description && <p className="input-description">{product.description}</p>}

                        <div className="input-price">{formatPrice(product.price)}</div>
                        <div className="input-unit">kwa {product.unit}</div>

                        {product.supplierName && (
                          <div className="input-supplier">
                            <i className="fas fa-store"></i> {product.supplierName}
                          </div>
                        )}
                        {product.location && (
                          <div className="input-location">
                            <i className="fas fa-map-marker-alt"></i> {product.location}
                          </div>
                        )}

                        <div className="input-stock">
                          {product.stockQuantity > 0 ? (
                            <span className="stock-available">
                              <i className="fas fa-check-circle"></i> Inapatikana: {product.stockQuantity} {product.unit}
                            </span>
                          ) : (
                            <span className="stock-out">
                              <i className="fas fa-times-circle"></i> Imeisha
                            </span>
                          )}
                        </div>

                        {product.averageRating > 0 && (
                          <div className="input-rating">
                            <div className="stars">
                              {[...Array(5)].map((_, i) => (
                                <i key={i} className={`fas fa-star ${i < Math.round(product.averageRating) ? 'filled' : ''}`}></i>
                              ))}
                            </div>
                            <span className="rating-text">{product.averageRating.toFixed(1)} ({product.totalReviews})</span>
                          </div>
                        )}

                        {product.stockQuantity > 0 && (
                          <div className="input-actions">
                            <div className="qty-input">
                              <button onClick={() => setQuantities(prev => ({ ...prev, [product._id]: Math.max(1, (Number(prev[product._id]) || 1) - 1) }))}>
                                <i className="fas fa-minus"></i>
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={product.stockQuantity}
                                value={quantities[product._id] || 1}
                                onChange={(e) => setQuantities(prev => ({ ...prev, [product._id]: Math.max(1, Number(e.target.value) || 1) }))}
                              />
                              <button onClick={() => setQuantities(prev => ({ ...prev, [product._id]: Math.min(product.stockQuantity, (Number(prev[product._id]) || 1) + 1) }))}>
                                <i className="fas fa-plus"></i>
                              </button>
                            </div>
                            {canBuy && (
                              <button
                                className={`btn btn-primary ${addedIds[product._id] ? 'added' : ''}`}
                                onClick={() => addToCart(product)}
                              >
                                {addedIds[product._id] ? (
                                  <><i className="fas fa-check"></i> Imewekwa</>
                                ) : (
                                  <><i className="fas fa-cart-plus"></i> Weka Kwenye Kikapu</>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3><i className="fas fa-shopping-cart"></i> Kikapu Chako ({cartCount})</h3>
              <button className="cart-close" onClick={() => setCartOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="cart-empty">
                  <i className="fas fa-shopping-basket"></i>
                  <p>Kikapu chako ni tupu</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item._id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">{formatPrice(item.price)} / {item.unit}</div>
                    </div>
                    <div className="cart-item-qty">
                      <button onClick={() => updateCartItem(item._id, item.quantity - 1)}>
                        <i className="fas fa-minus"></i>
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartItem(item._id, item.quantity + 1)}>
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                    <div className="cart-item-total">{formatPrice(item.price * item.quantity)}</div>
                    <button className="cart-item-remove" onClick={() => removeFromCart(item._id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span>Jumla:</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>
                <button className="btn btn-primary btn-block" onClick={() => { setCheckoutOpen(true); setCartOpen(false); }}>
                  <i className="fas fa-credit-card"></i> Endelea na Malipo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="cart-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-header">
              <h3><i className="fas fa-credit-card"></i> Kamilisha Agizo</h3>
              <button onClick={() => setCheckoutOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            {orderSuccess ? (
              <div className="checkout-success">
                <i className="fas fa-check-circle"></i>
                <h3>Agizo Limekamilika!</h3>
                <p>Namba ya agizo: <strong>{orderSuccess._id?.slice(-8).toUpperCase()}</strong></p>
                <p>Jumla: <strong>{formatPrice(orderSuccess.totalAmount)}</strong></p>
                <p className="checkout-note">Mtunza duka atawasiliana nawe hivi karibuni.</p>
                <button className="btn btn-primary" onClick={() => { setOrderSuccess(null); setCheckoutOpen(false); }}>
                  Sawa
                </button>
              </div>
            ) : (
              <form onSubmit={handleCheckout} className="checkout-form">
                <div className="checkout-summary">
                  <h4>Maelezo ya Agizo</h4>
                  {cart.map(item => (
                    <div key={item._id} className="checkout-item">
                      <span>{item.name} x{item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="checkout-item checkout-grand-total">
                    <strong>Jumla</strong>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>
                </div>

                <div className="checkout-fields">
                  <div className="form-group">
                    <label>Njia ya Upatikanaji *</label>
                    <select name="deliveryMethod" required>
                      <option value="pickup">Chukua Dukani</option>
                      <option value="delivery">Ufikishaji</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Anwani ya Upatikanaji / Eneo</label>
                    <input type="text" name="deliveryLocation" placeholder="Mf. Kijiji cha Iglelo, Mpanda" />
                  </div>

                  <div className="form-group">
                    <label>Namba ya Simu ya Mawasiliano *</label>
                    <input type="tel" name="contact" defaultValue={user?.phone || ''} required placeholder="07XX XXX XXX" />
                  </div>

                  <div className="form-group">
                    <label>Muda wa Malipo</label>
                    <select name="paymentProvider">
                      <option value="">Chagua njia ya malipo</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Tigo Pesa">Tigo Pesa</option>
                      <option value="Airtel Money">Airtel Money</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Namba ya Simu ya Malipo</label>
                    <input type="tel" name="paymentPhone" placeholder="07XX XXX XXX" />
                    <small className="form-hint">Utapokea STK push kwenye simu hii</small>
                  </div>
                </div>

                <div className="checkout-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setCheckoutOpen(false)}>
                    <i className="fas fa-arrow-left"></i> Rudi
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={orderLoading}>
                    {orderLoading ? (
                      <><i className="fas fa-spinner fa-spin"></i> Inatuma...</>
                    ) : (
                      <><i className="fas fa-paper-plane"></i> Weka Agizo</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inputs;
