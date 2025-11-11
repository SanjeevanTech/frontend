import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SeasonTicketManagement.css';
import { API } from '../config/api';

const API_BASE = API.node.busRoutes.replace('/bus-routes', ''); // Get base path

function SeasonTicketManagement() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, expired
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    ticket_type: 'monthly',
    valid_from: '',
    valid_until: '',
    from_location: '',
    to_location: ''
  });
  
  // Route configuration - removed (automatic GPS-based detection)
  
  // Face capture
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const [pendingStream, setPendingStream] = useState(null);
  const [editingMemberId, setEditingMemberId] = useState(null);

  useEffect(() => {
    fetchMembers();
    fetchStats();
  }, [filter]);

  // Handle stream assignment when video element is ready
  useEffect(() => {
    if (pendingStream && videoRef.current && isCameraActive) {
      videoRef.current.srcObject = pendingStream;
      
      videoRef.current.onloadedmetadata = () => {
        // Video loaded successfully
      };
      
      setPendingStream(null); // Clear pending stream
    }
  }, [pendingStream, isCameraActive]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const activeOnly = filter === 'active' ? 'true' : 'false';
      const response = await axios.get(`${API_BASE}/season-ticket/members?active_only=${activeOnly}`);
      
      let filteredMembers = response.data.members;
      
      if (filter === 'expired') {
        const now = new Date();
        filteredMembers = filteredMembers.filter(m => new Date(m.valid_until) < now);
      }
      
      setMembers(filteredMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      alert('Failed to fetch season ticket members');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/season-ticket/stats`);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const startCamera = async () => {
    try {
      // Check if browser supports camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support camera access. Please use Chrome, Firefox, or Edge.');
        return;
      }

      console.log('📡 Requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      console.log('✅ Camera access granted!');
      console.log('📹 Stream:', stream);
      console.log('📹 Stream tracks:', stream.getTracks());
      
      // Store stream and activate camera
      // useEffect will handle assigning stream to video element
      setPendingStream(stream);
      setIsCameraActive(true);
    } catch (error) {
      console.error('❌ Camera error:', error);
      
      let errorMessage = 'Failed to access camera.\n\n';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += '❌ Permission Denied\n\n';
        errorMessage += 'Please:\n';
        errorMessage += '1. Click the 🔒 lock icon in address bar\n';
        errorMessage += '2. Allow camera access\n';
        errorMessage += '3. Refresh the page and try again';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += '❌ No Camera Found\n\n';
        errorMessage += 'Please check:\n';
        errorMessage += '1. Camera is connected\n';
        errorMessage += '2. Camera is not being used by another app\n';
        errorMessage += '3. Camera drivers are installed';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += '❌ Camera In Use\n\n';
        errorMessage += 'Camera is being used by another application.\n';
        errorMessage += 'Please close other apps using the camera (Zoom, Teams, etc.)';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += '❌ Camera Settings Not Supported\n\n';
        errorMessage += 'Your camera does not support the requested settings.';
      } else if (error.name === 'SecurityError') {
        errorMessage += '❌ Security Error\n\n';
        errorMessage += 'Camera access blocked by browser security.\n';
        errorMessage += 'Make sure you are accessing via http://localhost';
      } else {
        errorMessage += `❌ Error: ${error.name}\n\n`;
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    console.log('⏹️ Stopping camera...');
    
    // Stop video element stream
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => {
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    
    // Stop pending stream if exists
    if (pendingStream) {
      pendingStream.getTracks().forEach(track => {
        track.stop();
      });
      setPendingStream(null);
    }
    
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    console.log('Video readyState:', video?.readyState);
    console.log('Video dimensions:', video?.videoWidth, 'x', video?.videoHeight);
    
    // Check if video is ready
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.error('❌ Video not ready:', {
        exists: !!video,
        readyState: video?.readyState,
        HAVE_ENOUGH_DATA: video?.HAVE_ENOUGH_DATA
      });
      alert('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }
    
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('❌ Video dimensions invalid:', video.videoWidth, 'x', video.videoHeight);
      alert('Camera stream not ready. Please wait a moment and try again.');
      return;
    }
    
    console.log(`📸 Capturing photo: ${video.videoWidth}x${video.videoHeight}`);
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Send to Python server for face embedding extraction
    try {
      console.log('📤 Sending to Python server...');
      const response = await axios.post(API.python.extractFace, {
        image_data: imageData
      }, {
        timeout: 10000 // 10 second timeout
      });
      
      console.log('📥 Response from server:', response.data);
      
      if (response.data.success && response.data.face_embedding) {
        setFaceEmbedding(response.data.face_embedding);
        
        // Build success message
        let successMsg = '✅ Face captured successfully!\n\n';
        
        if (response.data.is_mock) {
          successMsg += '⚠️ Using MOCK face recognition\n';
          successMsg += 'Install face-recognition library for production use.';
        } else {
          successMsg += `👤 Faces detected: ${response.data.num_faces || 1}\n`;
          successMsg += `📊 Embedding size: ${response.data.embedding_size} dimensions\n`;
          successMsg += '✅ Real face recognition active!';
        }
        
        alert(successMsg);
        stopCamera();
      } else {
        // Show detailed error message
        let errorMsg = '⚠️ No face detected.\n\n';
        errorMsg += response.data.message || 'Please try again.';
        errorMsg += '\n\nTips:\n';
        errorMsg += '• Ensure face is clearly visible\n';
        errorMsg += '• Use good lighting\n';
        errorMsg += '• Face camera directly\n';
        errorMsg += '• Remove glasses/masks if possible';
        alert(errorMsg);
      }
    } catch (error) {
      console.error('❌ Error extracting face embedding:', error);
      
      let errorMsg = 'Failed to process face.\n\n';
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMsg += '❌ Cannot connect to Python server.\n\n';
        errorMsg += 'Please make sure:\n';
        errorMsg += '1. Python server is running: python simplified_bus_server.py\n';
        errorMsg += '2. Server is on port 8888\n';
        errorMsg += '3. Check console for server errors';
      } else if (error.code === 'ECONNABORTED') {
        errorMsg += '❌ Request timeout.\n\n';
        errorMsg += 'Server took too long to respond.';
      } else {
        errorMsg += `Error: ${error.message}`;
      }
      
      alert(errorMsg);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Route functions removed - using automatic GPS-based detection

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // For new members, require face photo
    if (!editingMemberId && !faceEmbedding) {
      alert('Please capture face photo first');
      return;
    }
    
    if (!formData.from_location || !formData.to_location) {
      alert('Please enter From and To locations');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        valid_routes: [{
          from_location: formData.from_location,
          to_location: formData.to_location,
          route_patterns: []
        }]
      };
      
      // Add face embedding only for new members or if recaptured
      if (faceEmbedding) {
        payload.face_embedding = faceEmbedding;
        payload.embedding_size = faceEmbedding.length;
      }
      
      if (editingMemberId) {
        // Update existing member
        await axios.put(`${API_BASE}/season-ticket/members/${editingMemberId}`, payload);
        alert(`✅ Season ticket member updated successfully!\n\nValid for: ${formData.from_location} → ${formData.to_location}`);
      } else {
        // Create new member
        await axios.post(`${API_BASE}/season-ticket/members`, payload);
        alert(`✅ Season ticket member added successfully!\n\nValid for: ${formData.from_location} → ${formData.to_location}`);
      }
      
      resetForm();
      fetchMembers();
      fetchStats();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving member:', error);
      alert(error.response?.data?.message || 'Failed to save member');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      ticket_type: 'monthly',
      valid_from: '',
      valid_until: '',
      from_location: '',
      to_location: ''
    });
    setCapturedImage(null);
    setFaceEmbedding(null);
    setEditingMemberId(null);
    stopCamera();
  };

  const deactivateMember = async (memberId) => {
    if (!confirm('Are you sure you want to deactivate this member?')) return;
    
    try {
      await axios.delete(`${API_BASE}/season-ticket/members/${memberId}`);
      alert('Member deactivated successfully');
      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error('Error deactivating member:', error);
      alert('Failed to deactivate member');
    }
  };

  const reactivateMember = async (memberId) => {
    if (!confirm('Are you sure you want to reactivate this member?')) return;
    
    try {
      await axios.put(`${API_BASE}/season-ticket/members/${memberId}`, {
        is_active: true
      });
      alert('Member reactivated successfully');
      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error('Error reactivating member:', error);
      alert('Failed to reactivate member');
    }
  };

  const editMember = (member) => {
    // Populate form with member data
    setFormData({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      ticket_type: member.ticket_type,
      valid_from: member.valid_from ? new Date(member.valid_from).toISOString().split('T')[0] : '',
      valid_until: member.valid_until ? new Date(member.valid_until).toISOString().split('T')[0] : '',
      from_location: member.valid_routes?.[0]?.from_location || '',
      to_location: member.valid_routes?.[0]?.to_location || ''
    });
    
    // Store member_id for update
    setEditingMemberId(member.member_id);
    
    // Show form
    setShowAddForm(true);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="season-ticket-management">
      <h2>🎫 Season Ticket Management</h2>
      
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <h3>{stats.total}</h3>
            <p>Total Members</p>
          </div>
          <div className="stat-card active">
            <h3>{stats.active}</h3>
            <p>Active</p>
          </div>
          <div className="stat-card expired">
            <h3>{stats.expired}</h3>
            <p>Expired</p>
          </div>
          <div className="stat-card upcoming">
            <h3>{stats.upcoming}</h3>
            <p>Upcoming</p>
          </div>
        </div>
      )}
      
      <div className="controls">
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'active' ? 'active' : ''} 
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button 
            className={filter === 'expired' ? 'active' : ''} 
            onClick={() => setFilter('expired')}
          >
            Expired
          </button>
        </div>
        
        <button className="add-button" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '✕ Cancel' : '+ Add Member'}
        </button>
      </div>
      
      {showAddForm && (
        <div className="add-form-container">
          <h3>{editingMemberId ? 'Edit Season Ticket Member' : 'Add New Season Ticket Member'}</h3>
          
          <div className="camera-section">
            <h4>1. Capture Face Photo {editingMemberId && '(Optional - leave blank to keep existing)'}</h4>

            
            {!isCameraActive && !capturedImage && (
              <button onClick={startCamera} className="camera-button">
                📷 Start Camera
              </button>
            )}
            
            {isCameraActive && (
              <div className="camera-view">
                <div className="video-status">
                  <p>📹 Camera is active - You should see yourself below</p>
                </div>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  onLoadedMetadata={() => {
                    // Camera stream loaded
                  }}
                  onError={(e) => {
                    console.error('❌ Video element error:', e);
                  }}
                  onPlay={() => {
                    console.log('▶️ Video started playing');
                  }}
                />
                <div className="camera-controls">
                  <button onClick={capturePhoto}>📸 Capture</button>
                  <button onClick={stopCamera}>✕ Cancel</button>
                </div>
              </div>
            )}
            
            {capturedImage && (
              <div className="captured-image">
                <img src={capturedImage} alt="Captured face" />
                <button onClick={() => {
                  setCapturedImage(null);
                  setFaceEmbedding(null);
                  startCamera();
                }}>
                  🔄 Retake
                </button>
                {faceEmbedding && <span className="success">✓ Face processed</span>}
              </div>
            )}
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          
          <form onSubmit={handleSubmit}>
            <h4>2. Member Information</h4>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label>Ticket Type</label>
                <select
                  name="ticket_type"
                  value={formData.ticket_type}
                  onChange={handleInputChange}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Valid From *</label>
                <input
                  type="date"
                  name="valid_from"
                  value={formData.valid_from}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Valid Until *</label>
                <input
                  type="date"
                  name="valid_until"
                  value={formData.valid_until}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <h4>3. Valid Route Segment</h4>
            <p className="hint">Define the route segment where this season ticket is valid</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>From Location *</label>
                <input
                  type="text"
                  value={formData.from_location || ''}
                  onChange={(e) => setFormData({...formData, from_location: e.target.value})}
                  placeholder="e.g., Jaffna"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>To Location *</label>
                <input
                  type="text"
                  value={formData.to_location || ''}
                  onChange={(e) => setFormData({...formData, to_location: e.target.value})}
                  placeholder="e.g., Kodikamam"
                  required
                />
              </div>
            </div>
            
            <button type="submit" className="submit-button" disabled={!faceEmbedding}>
              💾 Save Season Ticket Member
            </button>
          </form>
        </div>
      )}
      
      <div className="members-list">
        <h3>Members ({members.length})</h3>
        {loading ? (
          <p>Loading...</p>
        ) : members.length === 0 ? (
          <p>No members found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Valid From</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Trips</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const now = new Date();
                const validFrom = new Date(member.valid_from);
                const validUntil = new Date(member.valid_until);
                const isActive = member.is_active && now >= validFrom && now <= validUntil;
                const isExpired = now > validUntil;
                
                return (
                  <tr key={member._id} className={isActive ? 'active' : isExpired ? 'expired' : ''}>
                    <td>{member.member_id}</td>
                    <td>{member.name}</td>
                    <td>{member.phone || '-'}</td>
                    <td>{member.ticket_type}</td>
                    <td>{new Date(member.valid_from).toLocaleDateString()}</td>
                    <td>{new Date(member.valid_until).toLocaleDateString()}</td>
                    <td>
                      <span className={`status ${isActive ? 'active' : isExpired ? 'expired' : 'inactive'}`}>
                        {isActive ? '✓ Active' : isExpired ? '✕ Expired' : '⏸ Inactive'}
                      </span>
                    </td>
                    <td>{member.total_trips || 0}</td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => editMember(member)} 
                        className="edit-btn"
                        title="Edit member details"
                      >
                        ✏️ Edit
                      </button>
                      {member.is_active ? (
                        <button 
                          onClick={() => deactivateMember(member.member_id)} 
                          className="deactivate-btn"
                          title="Deactivate season ticket"
                        >
                          ⏸️ Deactivate
                        </button>
                      ) : (
                        <button 
                          onClick={() => reactivateMember(member.member_id)} 
                          className="reactivate-btn"
                          title="Reactivate season ticket"
                        >
                          ▶️ Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default SeasonTicketManagement;
