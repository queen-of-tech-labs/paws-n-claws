import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bell, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendAdminBroadcast } from '@/components/services/oneSignalService';

export default function AdminBroadcastNotification() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      await sendAdminBroadcast({ title: title.trim(), body: body.trim(), url: url.trim() || '/' });
      setStatus('success');
      setTitle('');
      setBody('');
      setUrl('/');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-400" />
          Send Push Notification to All Users
        </CardTitle>
        <p className="text-sm text-slate-400">
          Broadcasts a push notification to every subscribed user via OneSignal.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-300 mb-1.5 block">Notification Title</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 🐾 New feature available!"
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            maxLength={100}
          />
        </div>

        <div>
          <Label className="text-slate-300 mb-1.5 block">Message</Label>
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="e.g. Check out our new AI Pet Assistant — now available for all Premium users."
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
            rows={3}
            maxLength={250}
          />
          <p className="text-xs text-slate-500 mt-1">{body.length}/250 characters</p>
        </div>

        <div>
          <Label className="text-slate-300 mb-1.5 block">Link (optional)</Label>
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/dashboard"
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 mt-1">Where the user goes when they tap the notification</p>
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Notification sent successfully to all subscribed users!
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <Button
          onClick={handleSend}
          disabled={sending || !title.trim() || !body.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {sending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
            : <><Send className="w-4 h-4 mr-2" /> Send to All Users</>
          }
        </Button>
      </CardContent>
    </Card>
  );
}
