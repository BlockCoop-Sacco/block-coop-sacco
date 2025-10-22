import React from 'react';
import { Dialog } from '@headlessui/react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorModalProps {
  open: boolean;
  title?: string;
  message: string;
  details?: string;
  onClose: () => void;
}

export function ErrorModal({ open, title = 'Something went wrong', message, details, onClose }: ErrorModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
        <Dialog.Panel className="mx-auto w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl animate-slide-up">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <Dialog.Title className="text-lg sm:text-xl font-bold text-gray-900">
                  {title}
                </Dialog.Title>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label="Close error modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-800">{message}</p>
              {details && (
                <pre className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{details}</pre>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={onClose} className="min-w-[96px]">OK</Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}




