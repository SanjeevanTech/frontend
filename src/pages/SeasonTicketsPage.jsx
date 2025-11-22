import { useState, useEffect, useRef } from 'react'
import axios from '../utils/axios'
import { pythonAxios } from '../utils/axios'
import { API } from '../config/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-hot-toast'

const API_BASE = '/api' // Node.js backend base path

function SeasonTicketsPage() {
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

  // Face capture
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const [pendingStream, setPendingStream] = useState(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, memberId: null, memberName: '' });

  useEffect(() => {
    fetchMembers();
    fetchStats();
  }, [filter]);

  // Handle stream assignment when video element is ready
  useEffect(() => {
    if (pendingStream && videoRef.current && isCameraActive) {
      videoRef.current.srcObject = pendingStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch(err => console.error('Play error:', err));
      };
      setPendingStream(null);
    }
  }, [pendingStream, isCameraActive]);

  const autoDeactivateExpired = async (members) => {
    const now = new Date();
    const expiredActiveMembers = members.filter(m => 
      m.is_active && new Date(m.valid_until) < now
    );

    if (expiredActiveMembers.length > 0) {
      console.log(`Auto-deactivating ${expiredActiveMembers.length} expired members`);
      
      for (const member of expiredActiveMembers) {
        try {
          await axios.put(`${API_BASE}/season-ticket/members/${member.member_id}`, {
            is_active: false
          });
          console.log(`Auto-deactivated expired member: ${member.member_id}`);
        } catch (error) {
          console.error(`Failed to auto-deactivate ${member.member_id}:`, error);
        }
      }
      
      if (expiredActiveMembers.length > 0) {
        toast.success(`Auto-deactivated ${expiredActiveMembers.length} expired member(s)`);
        return true; // Indicates members were deactivated
      }
    }
    return false;
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const activeOnly = filter === 'active' ? 'true' : 'false';
      const response = await axios.get(`${API_BASE}/season-ticket/members?active_only=${activeOnly}`);
      
      let filteredMembers = response.data.members;
      
      // Auto-deactivate expired members
      const wasDeactivated = await autoDeactivateExpired(filteredMembers);
      
      // If members were deactivated, fetch again to get updated data
      if (wasDeactivated) {
        const updatedResponse = await axios.get(`${API_BASE}/season-ticket/members?active_only=${activeOnly}`);
        filteredMembers = updatedResponse.data.members;
      }
      
      if (filter === 'expired') {
        const now = new Date();
        filteredMembers = filteredMembers.filter(m => new Date(m.valid_until) < now);
      }
      
      setMembers(filteredMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to fetch season ticket members');
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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Your browser does not support camera access. Please use Chrome, Firefox, or Edge.');
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
      setPendingStream(stream);
      setIsCameraActive(true);
    } catch (error) {
      console.error('❌ Camera error:', error);
      let errorMessage = 'Failed to access camera.\n\n';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += '❌ Permission Denied\n\nPlease:\n1. Click the 🔒 lock icon in address bar\n2. Allow camera access\n3. Refresh the page and try again';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += '❌ No Camera Found\n\nPlease check:\n1. Camera is connected\n2. Camera is not being used by another app\n3. Camera drivers are installed';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += '❌ Camera In Use\n\nCamera is being used by another application.\nPlease close other apps using the camera (Zoom, Teams, etc.)';
      } else {
        errorMessage += `❌ Error: ${error.name}\n\n${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    console.log('⏹️ Stopping camera...');
    
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (pendingStream) {
      pendingStream.getTracks().forEach(track => track.stop());
      setPendingStream(null);
    }
    
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast.error('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera stream not ready. Please wait a moment and try again.');
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
      const response = await pythonAxios.post(API.python.extractFace, {
        image_data: imageData
      }, {
        timeout: 10000
      });

      console.log('📥 Response from server:', response.data);

      if (response.data.success && response.data.face_embedding) {
        setFaceEmbedding(response.data.face_embedding);
        
        let successMsg = '✅ Face captured successfully!\n\n';
        if (response.data.is_mock) {
          successMsg += '⚠️ Using MOCK face recognition\nInstall face-recognition library for production use.';
        } else {
          successMsg += `👤 Faces detected: ${response.data.num_faces || 1}\n`;
          successMsg += `📊 Embedding size: ${response.data.embedding_size} dimensions\n`;
          successMsg += '✅ Real face recognition active!';
        }
        toast.success(successMsg, { duration: 4000 });
        stopCamera();
      } else {
        toast.error('⚠️ No face detected. Please try again with clear face visibility, good lighting, and face camera directly.');
      }
    } catch (error) {
      console.error('❌ Error extracting face embedding:', error);
      let errorMsg = 'Failed to process face.\n\n';
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMsg += '❌ Cannot connect to Python server.\n\nPlease make sure:\n1. Python server is running\n2. Server is on port 8888';
      } else {
        errorMsg += `Error: ${error.message}`;
      }
      toast.error(errorMsg);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // For new members, require face photo
    if (!editingMemberId && !faceEmbedding) {
      toast.error('Please capture face photo first');
      return;
    }

    if (!formData.from_location || !formData.to_location) {
      toast.error('Please enter From and To locations');
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
        await axios.put(`${API_BASE}/season-ticket/members/${editingMemberId}`, payload);
        toast.success(`Season ticket member updated successfully! Valid for: ${formData.from_location} → ${formData.to_location}`);
      } else {
        await axios.post(`${API_BASE}/season-ticket/members`, payload);
        toast.success(`Season ticket member added successfully! Valid for: ${formData.from_location} → ${formData.to_location}`);
      }

      resetForm();
      fetchMembers();
      fetchStats();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error(error.response?.data?.message || 'Failed to save member');
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

  const openDeactivateConfirm = (memberId, memberName) => {
    setConfirmModal({ open: true, type: 'deactivate', memberId, memberName });
  };

  const openReactivateConfirm = (memberId, memberName) => {
    setConfirmModal({ open: true, type: 'reactivate', memberId, memberName });
  };

  const openDeleteConfirm = (memberId, memberName) => {
    setConfirmModal({ open: true, type: 'delete', memberId, memberName });
  };

  const handleConfirmAction = async () => {
    const { type, memberId } = confirmModal;
    
    console.log('handleConfirmAction called:', { type, memberId });
    
    if (!memberId) {
      console.error('No memberId provided');
      toast.error('Invalid member ID');
      return;
    }

    try {
      if (type === 'deactivate') {
        console.log('Deactivating member:', memberId);
        const response = await axios.put(`${API_BASE}/season-ticket/members/${memberId}`, {
          is_active: false
        });
        console.log('Deactivate response:', response);
        toast.success('Member deactivated successfully');
      } else if (type === 'reactivate') {
        console.log('Reactivating member:', memberId);
        const response = await axios.put(`${API_BASE}/season-ticket/members/${memberId}`, {
          is_active: true
        });
        console.log('Reactivate response:', response);
        toast.success('Member reactivated successfully');
      } else if (type === 'delete') {
        console.log('Deleting member permanently:', memberId);
        const response = await axios.delete(`${API_BASE}/season-ticket/members/${memberId}`);
        console.log('Delete response:', response);
        toast.success('Member deleted permanently');
      }
      
      setConfirmModal({ open: false, type: null, memberId: null, memberName: '' });
      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error(`Error ${type}ing member:`, error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || `Failed to ${type} member`);
    }
  };

  const editMember = (member) => {
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

    setEditingMemberId(member.member_id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmModal({ open: false, type: null, memberId: null, memberName: '' })}
          />
          
          <div className="relative w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20" style={{ zIndex: 10000 }}>
            <div className="bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/20 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-2xl">
                  {confirmModal.type === 'deactivate' ? '⏸️' : confirmModal.type === 'delete' ? '🗑️' : '▶️'}
                </span>
                {confirmModal.type === 'deactivate' ? 'Deactivate Member' : confirmModal.type === 'delete' ? 'Delete Member' : 'Reactivate Member'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className={`rounded-xl border p-4 ${
                confirmModal.type === 'deactivate' 
                  ? 'bg-orange-500/10 border-orange-500/30' 
                  : confirmModal.type === 'delete'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <p className="text-slate-200 font-semibold mb-2">
                  {confirmModal.type === 'deactivate' 
                    ? `Deactivate ${confirmModal.memberName}?` 
                    : confirmModal.type === 'delete'
                    ? `Delete ${confirmModal.memberName}?`
                    : `Reactivate ${confirmModal.memberName}?`}
                </p>
                <p className="text-sm text-slate-300">
                  Member ID: <span className="font-mono text-purple-300">{confirmModal.memberId}</span>
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/30 border border-purple-500/20 p-4">
                <p className="text-sm text-slate-300">
                  {confirmModal.type === 'deactivate' ? (
                    <>
                      <span className="font-semibold text-slate-200">Note:</span> This member will no longer be able to use their season ticket. You can reactivate them later if needed.
                    </>
                  ) : confirmModal.type === 'delete' ? (
                    <>
                      <span className="font-semibold text-red-300">⚠️ Warning:</span> This will <strong>permanently delete</strong> this member and all their data. This action <strong>cannot be undone!</strong>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-200">Note:</span> This member will be able to use their season ticket again immediately.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/95 backdrop-blur-sm border-t border-purple-500/20 px-6 py-4 flex gap-3">
              <button
                onClick={() => setConfirmModal({ open: false, type: null, memberId: null, memberName: '' })}
                className="flex-1 px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 px-4 py-3 text-white rounded-lg shadow-lg transition-all font-semibold ${
                  confirmModal.type === 'deactivate'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/50 hover:shadow-xl'
                    : confirmModal.type === 'delete'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/50 hover:shadow-xl'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/50 hover:shadow-xl'
                }`}
              >
                {confirmModal.type === 'deactivate' ? 'Deactivate' : confirmModal.type === 'delete' ? 'Delete Permanently' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-100 flex items-center justify-center gap-2">
          <span>🎫</span>
          Season Ticket Management
        </h2>
        <p className="mt-2 text-sm text-slate-400">Manage season ticket holders with face recognition</p>
      </header>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-inner shadow-black/20">
            <h3 className="text-3xl font-bold text-slate-100">{stats.total}</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Total Members</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-inner shadow-black/20">
            <h3 className="text-3xl font-bold text-emerald-300">{stats.active}</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Active</p>
          </div>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-inner shadow-black/20">
            <h3 className="text-3xl font-bold text-red-300">{stats.expired}</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Expired</p>
          </div>
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 shadow-inner shadow-black/20">
            <h3 className="text-3xl font-bold text-blue-300">{stats.upcoming}</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Upcoming</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2">
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-slate-800/50 border border-purple-500/30 text-slate-300 hover:bg-slate-700/50'
            }`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'active' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-slate-800/50 border border-purple-500/30 text-slate-300 hover:bg-slate-700/50'
            }`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'expired' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-slate-800/50 border border-purple-500/30 text-slate-300 hover:bg-slate-700/50'
            }`}
            onClick={() => setFilter('expired')}
          >
            Expired
          </button>
        </div>
        
        <button 
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Member'}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-lg shadow-purple-500/10">
          <h3 className="text-2xl font-bold text-slate-100 mb-6">
            {editingMemberId ? '✏️ Edit Season Ticket Member' : '➕ Add New Season Ticket Member'}
          </h3>

          <div className="mb-8">
            <h4 className="text-lg font-semibold text-slate-200 mb-4">
              1. Capture Face Photo {editingMemberId && <span className="text-sm text-slate-400">(Optional - leave blank to keep existing)</span>}
            </h4>

            {!isCameraActive && !capturedImage && (
              <button 
                onClick={startCamera}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
              >
                📷 Start Camera
              </button>
            )}

            {isCameraActive && (
              <div className="space-y-3">
                <p className="text-sm text-slate-300 flex items-center gap-2">
                  <span className="text-lg">📹</span>
                  Camera is active - You should see yourself below
                </p>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full max-w-md border-2 border-purple-500/30 rounded-xl shadow-lg"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={capturePhoto}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
                  >
                    📸 Capture
                  </button>
                  <button 
                    onClick={stopCamera}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl transition-all"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-3">
                <img 
                  src={capturedImage} 
                  alt="Captured face" 
                  className="w-full max-w-md border-2 border-purple-500/30 rounded-xl shadow-lg" 
                />
                <div className="flex gap-3 items-center">
                  <button 
                    onClick={() => {
                      setCapturedImage(null);
                      setFaceEmbedding(null);
                      startCamera();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
                  >
                    🔄 Retake
                  </button>
                  {faceEmbedding && (
                    <span className="flex items-center gap-2 text-emerald-300 font-semibold">
                      <span className="text-xl">✓</span>
                      Face processed successfully
                    </span>
                  )}
                </div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-slate-200 mb-4">2. Member Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ticket Type</label>
                  <select
                    name="ticket_type"
                    value={formData.ticket_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
                  >
                    <option value="monthly" className="bg-slate-900 text-slate-100">Monthly</option>
                    <option value="quarterly" className="bg-slate-900 text-slate-100">Quarterly</option>
                    <option value="yearly" className="bg-slate-900 text-slate-100">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Valid From *</label>
                  <input
                    type="date"
                    name="valid_from"
                    value={formData.valid_from}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Valid Until *</label>
                  <input
                    type="date"
                    name="valid_until"
                    value={formData.valid_until}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-slate-200 mb-2">3. Valid Route Segment</h4>
              <p className="text-sm text-slate-400 mb-4">Define the route segment where this season ticket is valid</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Location *</label>
                  <input
                    type="text"
                    value={formData.from_location || ''}
                    onChange={(e) => setFormData({...formData, from_location: e.target.value})}
                    placeholder="e.g., Jaffna"
                    required
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Location *</label>
                  <input
                    type="text"
                    value={formData.to_location || ''}
                    onChange={(e) => setFormData({...formData, to_location: e.target.value})}
                    placeholder="e.g., Kodikamam"
                    required
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={!editingMemberId && !faceEmbedding}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700"
            >
              💾 Save Season Ticket Member
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/20">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-2xl font-bold text-slate-100">Members ({members.length})</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="xl" text="Loading members..." />
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-lg text-slate-400">No members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Member ID</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Valid From</th>
                  <th className="px-4 py-3 font-semibold">Valid Until</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Trips</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                {members.map(member => {
                  const now = new Date();
                  const validFrom = new Date(member.valid_from);
                  const validUntil = new Date(member.valid_until);
                  const isActive = member.is_active && now >= validFrom && now <= validUntil;
                  const isExpired = now > validUntil;

                  return (
                    <tr 
                      key={member._id} 
                      className={`hover:bg-slate-900/80 transition-colors ${
                        isActive ? 'bg-emerald-500/5' : isExpired ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-indigo-300">{member.member_id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{member.name}</td>
                      <td className="px-4 py-3 text-slate-300">{member.phone || '-'}</td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{member.ticket_type}</td>
                      <td className="px-4 py-3 text-slate-300">{new Date(member.valid_from).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-300">{new Date(member.valid_until).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                          isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                          'bg-slate-700/50 text-slate-400 border border-slate-600'
                        }`}>
                          {isActive ? '✓ Active' : isExpired ? '✕ Expired' : '⏸ Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{member.total_trips || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button 
                            onClick={() => editMember(member)}
                            className="px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-all"
                            title="Edit member details"
                          >
                            ✏️ Edit
                          </button>
                          {isActive ? (
                            <button 
                              onClick={() => openDeactivateConfirm(member.member_id, member.name)}
                              className="px-3 py-1.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-all"
                              title="Deactivate season ticket"
                            >
                              ⏸️ Deactivate
                            </button>
                          ) : (
                            <button 
                              onClick={() => openReactivateConfirm(member.member_id, member.name)}
                              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all"
                              title="Reactivate season ticket"
                            >
                              ▶️ Reactivate
                            </button>
                          )}
                          <button 
                            onClick={() => openDeleteConfirm(member.member_id, member.name)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-all"
                            title="Delete member permanently"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SeasonTicketsPage;
