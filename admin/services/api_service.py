"""
API Service for BlockCoop Admin Dashboard
Provides integration with the existing Node.js backend API
"""

import aiohttp
import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

class APIDataService:
    def __init__(self):
        self.base_url = os.environ.get('BLOCKCOOP_API_URL', 'http://localhost:3001')
        self.timeout = aiohttp.ClientTimeout(total=10)
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get backend API health status"""
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(f"{self.base_url}/api/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            'status': 'healthy',
                            'data': data,
                            'timestamp': datetime.utcnow().isoformat()
                        }
                    else:
                        return {
                            'status': 'unhealthy',
                            'error': f'HTTP {response.status}',
                            'timestamp': datetime.utcnow().isoformat()
                        }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def get_mpesa_config_status(self) -> Dict[str, Any]:
        """Get M-Pesa configuration status"""
        try:
            health_data = await self.get_health_status()
            if health_data['status'] == 'healthy' and 'data' in health_data:
                mpesa_config = health_data['data'].get('services', {}).get('mpesa', {})
                return {
                    'configured': mpesa_config.get('status') == 'configured',
                    'config': mpesa_config.get('config', {}),
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {
                    'configured': False,
                    'error': 'API not accessible',
                    'timestamp': datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                'configured': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def get_blockchain_config_status(self) -> Dict[str, Any]:
        """Get blockchain configuration status"""
        try:
            health_data = await self.get_health_status()
            if health_data['status'] == 'healthy' and 'data' in health_data:
                blockchain_config = health_data['data'].get('services', {}).get('blockchain', {})
                return {
                    'configured': blockchain_config.get('status') == 'configured',
                    'config': blockchain_config.get('config', {}),
                    'timestamp': datetime.utcnow().isoformat()
            }
            else:
                return {
                    'configured': False,
                    'error': 'API not accessible',
                    'timestamp': datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                'configured': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def get_database_status(self) -> Dict[str, Any]:
        """Get database status"""
        try:
            health_data = await self.get_health_status()
            if health_data['status'] == 'healthy' and 'data' in health_data:
                db_config = health_data['data'].get('services', {}).get('database', {})
                return {
                    'status': db_config.get('status', 'unknown'),
                    'type': db_config.get('type', 'unknown'),
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {
                    'status': 'unknown',
                    'error': 'API not accessible',
                    'timestamp': datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unknown',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def get_system_uptime(self) -> Dict[str, Any]:
        """Get system uptime information"""
        try:
            health_data = await self.get_health_status()
            if health_data['status'] == 'healthy' and 'data' in health_data:
                uptime_seconds = health_data['data'].get('uptime', 0)
                uptime_hours = uptime_seconds / 3600
                uptime_days = uptime_hours / 24
                
                return {
                    'uptime_seconds': uptime_seconds,
                    'uptime_hours': round(uptime_hours, 2),
                    'uptime_days': round(uptime_days, 2),
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {
                    'uptime_seconds': 0,
                    'uptime_hours': 0,
                    'uptime_days': 0,
                    'error': 'API not accessible',
                    'timestamp': datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                'uptime_seconds': 0,
                'uptime_hours': 0,
                'uptime_days': 0,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def get_comprehensive_api_status(self) -> Dict[str, Any]:
        """Get comprehensive API status"""
        try:
            # Run all status checks concurrently
            tasks = [
                self.get_health_status(),
                self.get_mpesa_config_status(),
                self.get_blockchain_config_status(),
                self.get_database_status(),
                self.get_system_uptime()
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            return {
                'health': results[0] if not isinstance(results[0], Exception) else {'error': str(results[0])},
                'mpesa': results[1] if not isinstance(results[1], Exception) else {'error': str(results[1])},
                'blockchain': results[2] if not isinstance(results[2], Exception) else {'error': str(results[2])},
                'database': results[3] if not isinstance(results[3], Exception) else {'error': str(results[3])},
                'uptime': results[4] if not isinstance(results[4], Exception) else {'error': str(results[4])},
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

# Global instance
api_service = APIDataService()
