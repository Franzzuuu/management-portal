'use client';

import { useRouter } from 'next/navigation';

export default function BackButton({ 
    text = "Back", 
    className = "", 
    onClick = null,
    fallbackPath = null 
}) {
    const router = useRouter();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (fallbackPath) {
            router.push(fallbackPath);
        } else {
            router.back();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`flex items-center text-green-700 hover:text-green-800 transition-colors font-medium hover:cursor-pointer ${className}`}
        >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {text}
        </button>
    );
}