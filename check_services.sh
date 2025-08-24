#!/bin/bash
# Script to check running services and processes on a VPS

echo "==========================================="
echo "   VPS Running Services & Processes Check"
echo "   Date: $(date)"
echo "==========================================="

echo ""
echo ">> Checking active systemd services..."
systemctl list-units --type=service --state=running | head -n 30
echo ""

echo ">> Top 10 CPU consuming processes..."
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | head -n 11
echo ""

echo ">> Top 10 Memory consuming processes..."
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -n 11
echo ""

echo ">> Listening Ports & Services..."
ss -tulnp | head -n 15
echo ""

echo ">> Disk Usage..."
df -h | grep -E '^/dev/'
echo ""

echo ">> System Uptime..."
uptime
echo ""
