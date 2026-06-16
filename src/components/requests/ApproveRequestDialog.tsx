import { useEffect, useState, KeyboardEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const TR_PL_REGEX = /^(TR|PL)-.+/i;

interface ApproveRequestDialogProps {
  docNumber?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (trNumber: string) => void;
}

export function ApproveRequestDialog({
  docNumber,
  open,
  onOpenChange,
  onApprove,
}: ApproveRequestDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setValue('');
      setError('');
    }
  }, [open]);

  const submit = () => {
    const clean = value.trim().toUpperCase();
    if (!TR_PL_REGEX.test(clean)) {
      setError('Reference must start with TR- or PL- and include a number.');
      return;
    }
    onApprove(clean);
    onOpenChange(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Request</DialogTitle>
          <DialogDescription>
            Enter the TR or PL reference number to approve{' '}
            <span className="font-mono">{docNumber}</span>. This action is final.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="tr-number">TR / PL Number</Label>
          <Input
            id="tr-number"
            placeholder="TR-08754 or PL-1234"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKey}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Must start with TR- or PL- followed by the reference.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
