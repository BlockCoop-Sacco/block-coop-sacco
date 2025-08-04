import { useState } from 'react';
import { CreditCard, Smartphone, Wallet } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

export type PaymentMethod = 'wallet' | 'mpesa';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  packageAmount: number; // USD amount
  disabled?: boolean;
}

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  packageAmount,
  disabled = false
}: PaymentMethodSelectorProps) {
  // Convert USD to KES for M-Pesa display
  const kesAmount = Math.round(packageAmount * 149.25);

  const paymentMethods = [
    {
      id: 'wallet' as PaymentMethod,
      name: 'Crypto Wallet',
      description: 'Pay with USDT from your connected wallet',
      icon: Wallet,
      amount: `${packageAmount} USDT`,
      features: [
        'Instant transaction',
        'No additional fees',
        'Blockchain secured'
      ],
      recommended: false
    },
    {
      id: 'mpesa' as PaymentMethod,
      name: 'M-Pesa',
      description: 'Pay with M-Pesa mobile money',
      icon: Smartphone,
      amount: `KES ${kesAmount.toLocaleString()}`,
      features: [
        'Mobile money payment',
        'Widely accepted in Kenya',
        'Secure STK Push'
      ],
      recommended: true
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Choose Payment Method
      </div>
      
      <div className="grid gap-3 sm:gap-4">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:border-gray-300 dark:hover:border-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onMethodChange(method.id)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {method.name}
                        </h3>
                        {method.recommended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 self-start">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {method.amount}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {method.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {method.features.map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {selectedMethod === 'mpesa' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-2">M-Pesa Payment Process:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Enter your M-Pesa phone number</li>
                <li>You'll receive an STK push notification</li>
                <li>Enter your M-Pesa PIN to complete payment</li>
                <li>Your USDT package will be processed automatically</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
