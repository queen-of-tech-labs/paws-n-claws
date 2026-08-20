import React, { useState, useRef } from 'react';
import { isNativePlatform } from '@/lib/platform';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Download, AlertTriangle, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LostPetFlyer({ open, onClose, pet, user }) {
  const flyerRef = useRef(null);
  const navigate = useNavigate();
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [lastSeen, setLastSeen] = useState('');
  const [reward, setReward] = useState('');
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [flyerGenerated, setFlyerGenerated] = useState(false);

  const isPremium = user?.premium_subscriber === true;

  if (!pet) return null;

  const speciesToEmoji = { dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐰', other: '🐾' };
  const emoji = speciesToEmoji[pet.species] || '🐾';

  const handleShare = async () => {
    setSharing(true);
    try {
      const shareText = `🚨 MISSING ${pet.species?.toUpperCase() || 'PET'} 🚨\n\nName: ${pet.name}\nBreed: ${pet.breed || 'Unknown'}\nColor: ${pet.color || 'Unknown'}\nGender: ${pet.gender || 'Unknown'}${pet.weight ? `\nWeight: ${pet.weight} lbs` : ''}${lastSeen ? `\nLast seen: ${lastSeen}` : ''}${reward ? `\nReward: ${reward}` : ''}\n\nIf found, please contact:\n${contactPhone ? `📞 ${contactPhone}\n` : ''}${contactEmail ? `📧 ${contactEmail}` : ''}\n\nPlease share to help find ${pet.name}! 🙏`;

      const isNative = isNativePlatform();

      if (isNative && navigator.share) {
        await navigator.share({
          title: `Missing ${pet.species}: ${pet.name}`,
          text: shareText,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `Missing ${pet.species}: ${pet.name}`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Flyer text copied to clipboard! Paste it anywhere to share.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        try {
          const shareText = `MISSING: ${pet.name} (${pet.breed || pet.species}) - Contact: ${contactPhone || contactEmail}`;
          await navigator.clipboard.writeText(shareText);
          alert('Copied to clipboard!');
        } catch (e) {
          alert('Could not share. Please screenshot the flyer and share manually.');
        }
      }
    } finally {
      setSharing(false);
      setFlyerGenerated(true);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('https://esm.sh/html2canvas@1.4.1');
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1e1b4b',
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `missing-${pet.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not download. Please screenshot the flyer instead.');
    } finally {
      setDownloading(false);
      setFlyerGenerated(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto bg-slate-900 border-slate-700 p-4">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Lost Pet Flyer
          </DialogTitle>
        </DialogHeader>

        {/* Contact info inputs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Your phone number</Label>
            <Input
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="bg-slate-800 border-slate-600 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Your email</Label>
            <Input
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-slate-800 border-slate-600 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Last seen location</Label>
            <Input
              value={lastSeen}
              onChange={e => setLastSeen(e.target.value)}
              placeholder="e.g. Oak Street Park"
              className="bg-slate-800 border-slate-600 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Reward (optional)</Label>
            <Input
              value={reward}
              onChange={e => setReward(e.target.value)}
              placeholder="e.g. $100 reward"
              className="bg-slate-800 border-slate-600 text-white text-sm"
            />
          </div>
        </div>

        {/* FLYER */}
        <div
          ref={flyerRef}
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
            borderRadius: '12px',
            padding: '24px',
            fontFamily: 'Arial, sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.05,
            backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
            backgroundSize: '12px 12px',
          }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px', position: 'relative' }}>
            <div style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '18px',
              fontWeight: '900',
              letterSpacing: '2px',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'inline-block',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 15px rgba(239,68,68,0.5)',
            }}>
              🚨 MISSING {pet.species?.toUpperCase() || 'PET'} 🚨
            </div>
          </div>

          {/* Photo + details */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', position: 'relative' }}>
            {/* Photo */}
            <div style={{ flexShrink: 0 }}>
              {pet.photo_url ? (
                <img
                  src={pet.photo_url}
                  alt={pet.name}
                  crossOrigin="anonymous"
                  style={{
                    width: '130px',
                    height: '130px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '3px solid #fbbf24',
                    boxShadow: '0 0 20px rgba(251,191,36,0.4)',
                  }}
                />
              ) : (
                <div style={{
                  width: '130px', height: '130px',
                  borderRadius: '12px',
                  border: '3px solid #fbbf24',
                  background: '#374151',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '48px',
                }}>
                  {emoji}
                </div>
              )}
            </div>

            {/* Pet details */}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fbbf24', fontSize: '28px', fontWeight: '900', lineHeight: 1.1, marginBottom: '8px' }}>
                {pet.name}
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                {[
                  ['Breed', pet.breed],
                  ['Color', pet.color],
                  ['Gender', pet.gender],
                  ['Weight', pet.weight ? `${pet.weight} lbs` : null],
                  ['Microchip', pet.microchip_number],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                    <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', minWidth: '52px' }}>{label}:</span>
                    <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Last seen */}
          {lastSeen && (
            <div style={{
              background: 'rgba(251,191,36,0.15)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '12px',
              textAlign: 'center',
              position: 'relative',
            }}>
              <div style={{ color: '#fbbf24', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', marginBottom: '4px', textAlign: 'center' }}>📍 LAST SEEN</div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>{lastSeen}</div>
            </div>
          )}

          {/* Reward */}
          {reward && (
            <div style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.4)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '12px',
              textAlign: 'center',
              position: 'relative',
            }}>
              <span style={{ color: '#4ade80', fontSize: '16px', fontWeight: '900' }}>💰 {reward.toUpperCase()}</span>
            </div>
          )}

          {/* Contact */}
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '12px',
            position: 'relative',
            textAlign: 'center',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px', textAlign: 'center' }}>
              IF FOUND, PLEASE CONTACT
            </div>
            {user?.full_name && (
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: '700', marginBottom: '4px', textAlign: 'center' }}>
                {user.full_name}
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {contactPhone && (
                <div style={{ color: '#60a5fa', fontSize: '14px', fontWeight: '600' }}>
                  📞 {contactPhone}
                </div>
              )}
              {contactEmail && (
                <div style={{ color: '#60a5fa', fontSize: '14px', fontWeight: '600' }}>
                  📧 {contactEmail}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '12px', color: '#64748b', fontSize: '10px', position: 'relative' }}>
            Created with Paws & Claws Pet Tracker
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Share2 className="w-4 h-4" />
            {sharing ? 'Sharing...' : 'Share'}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Saving...' : 'Save Image'}
          </Button>
        </div>

        {/* Lost Pet Network upsell — shown after flyer is shared/downloaded */}
        {flyerGenerated && (
          <div className="mt-4 rounded-xl border p-4 flex items-start gap-3 bg-slate-800/50 border-slate-600">
            <Radio className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {isPremium ? (
                <>
                  <p className="text-white text-sm font-semibold mb-1">
                    Also post to the Lost Pet Network
                  </p>
                  <p className="text-slate-400 text-xs mb-3">
                    Get live sightings from the community and notify nearby users.
                  </p>
                  <button
                    onClick={() => { onClose(); navigate("/lost-pet-network"); }}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                  >
                    Post to Lost Pet Network →
                  </button>
                </>
              ) : (
                <>
                  <p className="text-white text-sm font-semibold mb-1">
                    🐾 Want the community to help find {pet.name}?
                  </p>
                  <p className="text-slate-400 text-xs mb-3">
                    Upgrade to Premium to post a live alert — get notified when someone spots them nearby.
                  </p>
                  <button
                    onClick={() => { onClose(); navigate("/account"); }}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                  >
                    Unlock Premium →
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
