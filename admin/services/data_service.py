"""
Enhanced Data Service for BlockCoop Admin Dashboard
Provides comprehensive data integration from multiple sources
"""

import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import os

from .blockchain_service import blockchain_service
from .api_service import api_service

class EnhancedDataService:
    def __init__(self):
        self.db_path = os.environ.get('MPESA_DB_PATH', '../data/mpesa_development.db')
    
    def get_db_connection(self):
        """Get database connection"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            return conn
        except Exception as e:
            print(f"Database connection error: {e}")
            return None
    
    def get_enhanced_transaction_stats(self) -> Dict[str, Any]:
        """Get enhanced transaction statistics"""
        conn = self.get_db_connection()
        if not conn:
            return {'error': 'Database connection failed'}
        
        try:
            cursor = conn.cursor()
            
            # Basic transaction counts
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                    COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout
                FROM mpesa_transactions
            """)
            basic_stats = dict(cursor.fetchone())
            
            # Amount statistics
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN status = 'completed' THEN amountUsd ELSE 0 END) as total_usd,
                    SUM(CASE WHEN status = 'completed' THEN amountKes ELSE 0 END) as total_kes,
                    AVG(CASE WHEN status = 'completed' THEN amountUsd ELSE NULL END) as avg_usd,
                    MIN(CASE WHEN status = 'completed' THEN amountUsd ELSE NULL END) as min_usd,
                    MAX(CASE WHEN status = 'completed' THEN amountUsd ELSE NULL END) as max_usd
                FROM mpesa_transactions
            """)
            amount_stats = dict(cursor.fetchone())
            
            # Package statistics
            cursor.execute("""
                SELECT 
                    packageId,
                    COUNT(*) as total_purchases,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_purchases,
                    SUM(CASE WHEN status = 'completed' THEN amountUsd ELSE 0 END) as total_usd,
                    SUM(CASE WHEN status = 'completed' THEN amountKes ELSE 0 END) as total_kes,
                    AVG(CASE WHEN status = 'completed' THEN amountUsd ELSE NULL END) as avg_amount
                FROM mpesa_transactions 
                GROUP BY packageId
                ORDER BY total_purchases DESC
            """)
            package_stats = [dict(row) for row in cursor.fetchall()]
            
            # Daily statistics (last 30 days)
            cursor.execute("""
                SELECT 
                    DATE(createdAt) as date,
                    COUNT(*) as daily_transactions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as daily_completed,
                    SUM(CASE WHEN status = 'completed' THEN amountUsd ELSE 0 END) as daily_usd,
                    SUM(CASE WHEN status = 'completed' THEN amountKes ELSE 0 END) as daily_kes
                FROM mpesa_transactions 
                WHERE createdAt >= datetime('now', '-30 days')
                GROUP BY DATE(createdAt)
                ORDER BY date DESC
            """)
            daily_stats = [dict(row) for row in cursor.fetchall()]
            
            # Recent transactions
            cursor.execute("""
                SELECT * FROM mpesa_transactions 
                ORDER BY createdAt DESC 
                LIMIT 20
            """)
            recent_transactions = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                'basic_stats': basic_stats,
                'amount_stats': amount_stats,
                'package_stats': package_stats,
                'daily_stats': daily_stats,
                'recent_transactions': recent_transactions,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            conn.close()
            return {'error': str(e)}
    
    def get_user_analytics(self) -> Dict[str, Any]:
        """Get user analytics"""
        conn = self.get_db_connection()
        if not conn:
            return {'error': 'Database connection failed'}
        
        try:
            cursor = conn.cursor()
            
            # Unique users
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT walletAddress) as unique_wallets,
                    COUNT(DISTINCT phoneNumber) as unique_phones
                FROM mpesa_transactions
            """)
            user_counts = dict(cursor.fetchone())
            
            # Top users by transaction count
            cursor.execute("""
                SELECT 
                    walletAddress,
                    phoneNumber,
                    COUNT(*) as transaction_count,
                    SUM(CASE WHEN status = 'completed' THEN amountUsd ELSE 0 END) as total_usd,
                    SUM(CASE WHEN status = 'completed' THEN amountKes ELSE 0 END) as total_kes
                FROM mpesa_transactions 
                GROUP BY walletAddress, phoneNumber
                ORDER BY transaction_count DESC
                LIMIT 10
            """)
            top_users = [dict(row) for row in cursor.fetchall()]
            
            # Referral statistics
            cursor.execute("""
                SELECT 
                    referrerAddress,
                    COUNT(*) as referral_count,
                    SUM(CASE WHEN status = 'completed' THEN amountUsd ELSE 0 END) as referral_usd
                FROM mpesa_transactions 
                WHERE referrerAddress IS NOT NULL
                GROUP BY referrerAddress
                ORDER BY referral_count DESC
                LIMIT 10
            """)
            referral_stats = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                'user_counts': user_counts,
                'top_users': top_users,
                'referral_stats': referral_stats,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            conn.close()
            return {'error': str(e)}
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        conn = self.get_db_connection()
        if not conn:
            return {'error': 'Database connection failed'}
        
        try:
            cursor = conn.cursor()
            
            # Success rate by hour
            cursor.execute("""
                SELECT 
                    strftime('%H', createdAt) as hour,
                    COUNT(*) as total_transactions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
                FROM mpesa_transactions 
                GROUP BY strftime('%H', createdAt)
                ORDER BY hour
            """)
            hourly_performance = [dict(row) for row in cursor.fetchall()]
            
            # Success rate by day of week
            cursor.execute("""
                SELECT 
                    strftime('%w', createdAt) as day_of_week,
                    CASE strftime('%w', createdAt)
                        WHEN '0' THEN 'Sunday'
                        WHEN '1' THEN 'Monday'
                        WHEN '2' THEN 'Tuesday'
                        WHEN '3' THEN 'Wednesday'
                        WHEN '4' THEN 'Thursday'
                        WHEN '5' THEN 'Friday'
                        WHEN '6' THEN 'Saturday'
                    END as day_name,
                    COUNT(*) as total_transactions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
                FROM mpesa_transactions 
                GROUP BY strftime('%w', createdAt)
                ORDER BY day_of_week
            """)
            daily_performance = [dict(row) for row in cursor.fetchall()]
            
            # Error analysis
            cursor.execute("""
                SELECT 
                    resultCode,
                    resultDesc,
                    COUNT(*) as error_count
                FROM mpesa_transactions 
                WHERE status = 'failed' AND resultCode IS NOT NULL
                GROUP BY resultCode, resultDesc
                ORDER BY error_count DESC
            """)
            error_analysis = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                'hourly_performance': hourly_performance,
                'daily_performance': daily_performance,
                'error_analysis': error_analysis,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            conn.close()
            return {'error': str(e)}
    
    async def get_comprehensive_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive dashboard data from all sources"""
        try:
            # Run all data collection tasks concurrently
            tasks = [
                asyncio.create_task(asyncio.to_thread(self.get_enhanced_transaction_stats)),
                asyncio.create_task(asyncio.to_thread(self.get_user_analytics)),
                asyncio.create_task(asyncio.to_thread(self.get_performance_metrics)),
                asyncio.create_task(blockchain_service.get_comprehensive_stats()),
                asyncio.create_task(api_service.get_comprehensive_api_status())
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            return {
                'transaction_stats': results[0] if not isinstance(results[0], Exception) else {'error': str(results[0])},
                'user_analytics': results[1] if not isinstance(results[1], Exception) else {'error': str(results[1])},
                'performance_metrics': results[2] if not isinstance(results[2], Exception) else {'error': str(results[2])},
                'blockchain_data': results[3] if not isinstance(results[3], Exception) else {'error': str(results[3])},
                'api_status': results[4] if not isinstance(results[4], Exception) else {'error': str(results[4])},
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

# Global instance
data_service = EnhancedDataService()
