#!/bin/bash
# Verba System Audio Setup Script
# Creates PulseAudio virtual sink that combines microphone and system audio
# while still allowing you to hear what's playing

set -e

echo "🎵 Setting up Verba system audio..."

# Check if module already exists
if pactl list sinks short | grep -q "Verba_Combined_Audio"; then
    echo "⚠️  Verba audio sink already exists. Removing old setup..."
    # Remove existing modules
    pactl unload-module module-null-sink 2>/dev/null || true
    pactl list modules short | grep "Verba_Combined_Audio" | awk '{print $1}' | xargs -I {} pactl unload-module {} 2>/dev/null || true
    sleep 1
fi

# Get default sink (speakers/headphones)
DEFAULT_SINK=$(pactl get-default-sink)
echo "📢 Default audio output: $DEFAULT_SINK"

# Get default source (microphone)
DEFAULT_SOURCE=$(pactl get-default-source)
echo "🎤 Default microphone: $DEFAULT_SOURCE"

# Create virtual null sink for combined audio (this is what we'll record from)
echo "Creating virtual audio sink..."
pactl load-module module-null-sink \
    sink_name=Verba_Combined_Audio \
    sink_properties="device.description='Verba Combined Audio (for recording)'"

# Create loopback from system audio to combined sink (so system audio gets recorded)
# Using higher latency to prevent audio glitches
echo "Routing system audio to combined sink..."
pactl load-module module-loopback \
    source="${DEFAULT_SINK}.monitor" \
    sink=Verba_Combined_Audio \
    latency_msec=20

# Create loopback from microphone to combined sink (so mic gets recorded)
echo "Routing microphone to combined sink..."
pactl load-module module-loopback \
    source="${DEFAULT_SOURCE}" \
    sink=Verba_Combined_Audio \
    latency_msec=20

# IMPORTANT: Route combined sink BACK to default speakers 
# This is what allows you to HEAR what's playing
echo "Routing combined audio back to speakers (so you can hear)..."
pactl load-module module-loopback \
    source=Verba_Combined_Audio.monitor \
    sink="${DEFAULT_SINK}" \
    latency_msec=20

echo ""
echo "✅ Audio setup complete!"
echo ""
echo "📋 How to use:"
echo "   1. In your browser/recording app, select 'Monitor of Verba Combined Audio' as input"
echo "   2. Play audio in any application or browser"
echo "   3. You will HEAR the audio normally through your speakers"
echo "   4. The audio will also be captured in your recording"
echo ""
echo "🔧 To remove this setup later, run:"
echo "   pactl unload-module module-null-sink"
echo "   pactl unload-module module-loopback"
echo ""
