// src/app/admin/violations/components/ViolationCard.js
'use client';

import { useState } from 'react';
import {
    User,
    Car,
    Calendar,
    AlertTriangle,
    Eye,
    Edit,
    Check,
    X,
    Clock,
    Phone,
    Mail,
    Badge,
    Camera,
    Hash
} from 'lucide-react';

export default function ViolationCard({ violation, onStatusUpdate, onView }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'resolved': return 'bg-green-500';
            case 'contested': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusTextColor = (status) => {
        switch (status) {
            case 'pending': return 'text-yellow-700';
            case 'resolved': return 'text-green-700';
            case 'contested': return 'text-red-700';
            default: return 'text-gray-700';
        }
    };

    const getVehicleTypeIcon = (type) => {
        return type === '2-wheel' ? '🏍️' : '🚗';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleStatusUpdate = async (newStatus) => {
        setIsUpdating(true);
        try {
            await onStatusUpdate(violation.id, newStatus);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                {/* Header with Status and Actions */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(violation.status)}`}></div>
                            <div>
                                <h3 className="font-semibold text-gray-900">
                                    Violation #{violation.id}
                                </h3>
                                <p className={`text-sm font-medium ${getStatusTextColor(violation.status)}`}>
                                    {violation.status.charAt(0).toUpperCase() + violation.status.slice(1)}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {violation.image_data && (
                                <button
                                    onClick={() => setShowImageModal(true)}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="View Evidence"
                                >
                                    <Camera className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={() => onView?.(violation)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View Details"
                            >
                                <Eye className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-4">
                    {/* Violation Type */}
                    <div className="mb-4">
                        <div
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: '#355E3B' }}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            {violation.violation_type}
                        </div>
                        {violation.same_violation_count > 1 && (
                            <span className="ml-2 text-sm text-orange-600">
                                ({violation.same_violation_count} similar violations)
                            </span>
                        )}
                    </div>

                    {/* User Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <User className="h-4 w-4" style={{ color: '#355E3B' }} />
                                Vehicle Owner Information
                            </h4>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Hash className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium">User ID:</span>
                                    <span className="text-gray-600">#{violation.user_id}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium">Name:</span>
                                    <span className="text-gray-600">{violation.owner_name}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Badge className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium">Type:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${violation.owner_designation === 'Student' ? 'bg-blue-100 text-blue-700' :
                                        violation.owner_designation === 'Faculty' ? 'bg-purple-100 text-purple-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {violation.owner_designation}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium">Email:</span>
                                    <span className="text-gray-600 text-xs">{violation.owner_email}</span>
                                </div>

                                {violation.owner_phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3 text-gray-400" />
                                        <span className="font-medium">Phone:</span>
                                        <span className="text-gray-600">{violation.owner_phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vehicle Information */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <Car className="h-4 w-4" style={{ color: '#355E3B' }} />
                                Vehicle Information
                            </h4>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{getVehicleTypeIcon(violation.vehicle_type)}</span>
                                    <span className="font-medium">Type:</span>
                                    <span className="text-gray-600">{violation.vehicle_type}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Hash className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium">Plate:</span>
                                    <span className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                        {violation.plate_number}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Car className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium">Make/Model:</span>
                                    <span className="text-gray-600">{violation.vehicle_make} {violation.vehicle_model}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full border border-gray-300"
                                        style={{ backgroundColor: violation.vehicle_color.toLowerCase() }}
                                        title={violation.vehicle_color}
                                    ></div>
                                    <span className="font-medium">Color:</span>
                                    <span className="text-gray-600">{violation.vehicle_color}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Violation Statistics */}
                    <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                        <div className="text-center">
                            <div className="text-lg font-bold text-red-600">{violation.owner_total_violations}</div>
                            <div className="text-xs text-gray-500">Total Violations</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">{violation.owner_pending_violations}</div>
                            <div className="text-xs text-gray-500">Pending</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold" style={{ color: '#355E3B' }}>{violation.same_violation_count}</div>
                            <div className="text-xs text-gray-500">Same Type</div>
                        </div>
                    </div>

                    {/* Date and Reporter Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">Violation Date:</span>
                            </div>
                            <div className="text-gray-600 ml-6">{formatDate(violation.created_at)}</div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">Reported By:</span>
                            </div>
                            <div className="text-gray-600 ml-6">{violation.reported_by_name}</div>
                        </div>
                    </div>

                    {/* Description */}
                    {violation.description && (
                        <div className="mb-4">
                            <div className="text-sm font-medium text-gray-700 mb-1">Description:</div>
                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                {violation.description}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                        {violation.status === 'pending' && (
                            <>
                                <button
                                    onClick={() => handleStatusUpdate('resolved')}
                                    disabled={isUpdating}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                >
                                    <Check className="h-4 w-4" />
                                    {isUpdating ? 'Updating...' : 'Resolve'}
                                </button>

                                <button
                                    onClick={() => handleStatusUpdate('contested')}
                                    disabled={isUpdating}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                >
                                    <X className="h-4 w-4" />
                                    Contest
                                </button>
                            </>
                        )}

                        {violation.status === 'contested' && (
                            <button
                                onClick={() => handleStatusUpdate('resolved')}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                <Check className="h-4 w-4" />
                                {isUpdating ? 'Updating...' : 'Resolve'}
                            </button>
                        )}

                        {violation.status === 'resolved' && (
                            <button
                                onClick={() => handleStatusUpdate('pending')}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                <Clock className="h-4 w-4" />
                                {isUpdating ? 'Updating...' : 'Reopen'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            {showImageModal && violation.image_data && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
                    <div className="relative max-w-4xl max-h-full">
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                        >
                            <X className="h-8 w-8" />
                        </button>
                        <img
                            src={`data:${violation.image_mime_type};base64,${violation.image_data}`}
                            alt="Violation evidence"
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 rounded-b-lg">
                            <h3 className="font-semibold">Violation Evidence</h3>
                            <p className="text-sm">Violation #{violation.id} - {violation.violation_type}</p>
                            <p className="text-xs text-gray-300">Captured: {formatDate(violation.created_at)}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}