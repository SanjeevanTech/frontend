import { useState, useEffect, useRef } from 'react'
import axios from '../utils/axios'
import { pythonAxios } from '../utils/axios'
import { API } from '../config/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-hot-toast'

const API_BASE = '/api'

function ContractorsPage() {
    const [contractors, setContractors] = useState([]);
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        bus_id: '',
        name: ''
    });

    // Face capture
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [faceEmbedding, setFaceEmbedding] = useState(null);
    const [isProcessingFace, setIsProcessingFace] = useState(false);
    const [activeStream, setActiveStream] = useState(null);
    const [editingBusId, setEditingBusId] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, busId: null, name: '' });

    useEffect(() => {
        fetchContractors();
        fetchBuses();
    }, []);

    // Handle stream assignment when video element is ready
    useEffect(() => {
        if (activeStream && videoRef.current && isCameraActive) {
            videoRef.current.srcObject = activeStream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current.play().catch(err => console.error('Play error:', err));
            };
        }
    }, [activeStream, isCameraActive]);

    const fetchBuses = async () => {
        try {
            const response = await axios.get(API.node.buses);
            // Handle both array and object formats
            let busesData = [];
            if (Array.isArray(response.data)) {
                busesData = response.data;
            } else if (response.data && typeof response.data === 'object' && !response.data.success) {
                // It's the Python-style mapping { bus_id: { ... } }
                busesData = Object.values(response.data);
            } else if (response.data?.success && Array.isArray(response.data.buses)) {
                busesData = response.data.buses;
            }
            setBuses(busesData || []);
        } catch (error) {
            console.error('Error fetching buses:', error);
        }
    };

    const fetchContractors = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/contractors`);
            if (response.data.success) {
                setContractors(response.data.contractors);
            }
        } catch (error) {
            console.error('Error fetching contractors:', error);
            toast.error('Failed to fetch contractors');
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error('Your browser does not support camera access. Please use Chrome or Firefox.');
                return;
            }

            console.log('📡 Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            });

            console.log('✅ Camera access granted');
            setActiveStream(stream);
            setIsCameraActive(true);

            // Set stream and try to play manually to handle autoplay blocks
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(err => {
                        console.error('Play error:', err);
                        toast.error('Video autoplay blocked. Please click capture.');
                    });
                };
            }
        } catch (error) {
            console.error('❌ Camera error:', error);
            let msg = 'Failed to access camera';
            if (error.name === 'NotAllowedError') msg = 'Camera permission denied';
            else if (error.name === 'NotFoundError') msg = 'No camera found';
            else if (error.name === 'NotReadableError') msg = 'Camera is already in use by another app';

            toast.error(msg);
        }
    };

    const stopCamera = () => {
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
            setActiveStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = async () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
            toast.error('Camera not ready');
            return;
        }

        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedImage(imageData);
        stopCamera();

        try {
            setIsProcessingFace(true);
            const response = await pythonAxios.post(API.python.extractFace, {
                image_data: imageData
            });

            if (response.data.success && response.data.face_embedding) {
                setFaceEmbedding(response.data.face_embedding);
                if (response.data.image_with_boxes) {
                    setCapturedImage(response.data.image_with_boxes);
                }
                toast.success('Face captured successfully!');
            } else {
                toast.error('No face detected. Please try again.');
                setCapturedImage(null);
            }
        } catch (error) {
            console.error('Face processing error:', error);
            toast.error('Failed to process face');
            setCapturedImage(null);
        } finally {
            setIsProcessingFace(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!faceEmbedding && !editingBusId) {
            toast.error('Please capture face photo first');
            return;
        }

        if (!formData.bus_id || !formData.name) {
            toast.error('Please fill all required fields');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                face_embedding: faceEmbedding,
                embedding_size: faceEmbedding ? faceEmbedding.length : undefined
            };

            const response = await axios.post(`${API_BASE}/contractors`, payload);
            if (response.data.success) {
                toast.success(editingBusId ? 'Contractor updated!' : 'Contractor added!');
                fetchContractors();
                resetForm();
                setShowAddForm(false);
            }
        } catch (error) {
            console.error('Error saving contractor:', error);
            toast.error(error.response?.data?.message || 'Failed to save contractor');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({ bus_id: '', name: '' });
        setCapturedImage(null);
        setFaceEmbedding(null);
        setEditingBusId(null);
        stopCamera();
    };

    const editContractor = (contractor) => {
        setFormData({
            bus_id: contractor.bus_id,
            name: contractor.name
        });
        setEditingBusId(contractor.bus_id);
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async () => {
        try {
            const response = await axios.delete(`${API_BASE}/contractors/${deleteModal.busId}`);
            if (response.data.success) {
                toast.success('Contractor deleted');
                fetchContractors();
                setDeleteModal({ open: false, busId: null, name: '' });
            }
        } catch (error) {
            toast.error('Failed to delete contractor');
        }
    };

    return (
        <div className="space-y-6">
            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, busId: null, name: '' })} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <span className="text-2xl">🗑️</span> Delete Contractor
                        </h3>
                        <p className="text-slate-300 mb-6">Are you sure you want to remove the contractor for <span className="font-bold text-red-400">{deleteModal.busId}</span> ({deleteModal.name})?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal({ open: false, busId: null, name: '' })} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <header className="text-center">
                <h2 className="text-3xl font-bold text-slate-100 flex items-center justify-center gap-2">
                    <span>🛡️</span> Contractor Management
                </h2>
                <p className="mt-2 text-sm text-slate-400">Register bus contractors to exclude them from passenger counts</p>
            </header>

            <div className="flex justify-end">
                <button
                    onClick={() => {
                        if (showAddForm) resetForm();
                        setShowAddForm(!showAddForm);
                    }}
                    className={`px-6 py-3 rounded-lg font-semibold shadow-lg transition-all ${showAddForm ? 'bg-slate-800 text-slate-300' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        }`}
                >
                    {showAddForm ? '✕ Cancel' : '+ Add Contractor'}
                </button>
            </div>

            {showAddForm && (
                <div className="rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-lg">
                    <h3 className="text-2xl font-bold text-slate-100 mb-6">
                        {editingBusId ? '✏️ Edit Contractor' : '➕ Register Contractor'}
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-slate-200">1. Face Capture</h4>
                            {!isCameraActive && !capturedImage && (
                                <button onClick={startCamera} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold">📷 Start Camera</button>
                            )}
                            {isCameraActive && (
                                <div className="space-y-3">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm border-2 border-purple-500/30 rounded-xl" />
                                    <div className="flex gap-3">
                                        <button onClick={capturePhoto} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">📸 Capture</button>
                                        <button onClick={stopCamera} className="px-4 py-2 bg-slate-800 text-white rounded-lg">✕ Stop</button>
                                    </div>
                                </div>
                            )}
                            {capturedImage && (
                                <div className="space-y-3">
                                    <div className="relative w-full max-w-sm">
                                        <img src={capturedImage} alt="Captured face" className="w-full border-2 border-purple-500/30 rounded-xl" />
                                        {isProcessingFace && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-xl backdrop-blur-sm">
                                                <LoadingSpinner size="md" text="Processing..." />
                                            </div>
                                        )}
                                    </div>
                                    {!isProcessingFace && (
                                        <button onClick={() => { setCapturedImage(null); startCamera(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">🔄 Retake</button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-lg font-semibold text-slate-200">2. Contractor Details</h4>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Bus ID *</label>
                                    <select
                                        value={formData.bus_id}
                                        onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-slate-800 border border-purple-500/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value="">Select a Bus</option>
                                        {buses.map(bus => (
                                            <option key={bus.bus_id} value={bus.bus_id}>{bus.bus_id} ({bus.bus_name})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Contractor Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter full name"
                                        required
                                        className="w-full px-4 py-3 bg-slate-800 border border-purple-500/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving || (!faceEmbedding && !editingBusId)}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold shadow-lg disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingBusId ? 'Update Contractor' : 'Register Contractor'}
                                </button>
                            </form>
                        </div>
                    </div>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
                <div className="inline-block min-w-full align-middle">
                    <table className="min-w-[800px] w-full text-left">
                        <thead className="bg-slate-800/50 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5">Bus ID</th>
                                <th className="px-6 py-5">Contractor Name</th>
                                <th className="px-6 py-5">Registered On</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-20 text-center"><LoadingSpinner text="Loading contractors..." /></td></tr>
                            ) : contractors.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-20 text-center text-slate-500 font-medium">No contractors registered yet.</td></tr>
                            ) : contractors.map(contractor => (
                                <tr key={contractor.bus_id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-5 whitespace-nowrap font-mono text-purple-400 font-bold">{contractor.bus_id}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-slate-200 font-medium">{contractor.name}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-slate-400 text-xs">{new Date(contractor.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-5 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => editContractor(contractor)}
                                                className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => setDeleteModal({ open: true, busId: contractor.bus_id, name: contractor.name })}
                                                className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ContractorsPage;
