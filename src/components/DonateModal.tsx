import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DonateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DonateModal = ({ open, onOpenChange }: DonateModalProps) => {
  const [copied, setCopied] = useState(false);
  
  // Replace with your actual UPI ID
  const upiId = "yourname@upi";
  
  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Support Our Project
          </DialogTitle>
          <DialogDescription>
            If you find DataFlow AI helpful, consider supporting us with a small donation. Every contribution helps us improve!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          {/* UPI QR Code - Replace with your actual QR code image */}
          <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground">
                Add your UPI QR code image here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                (Replace in DonateModal.tsx)
              </p>
            </div>
            {/* Uncomment and add your QR code image:
            <img 
              src="/your-upi-qr-code.png" 
              alt="UPI QR Code" 
              className="w-full h-full object-contain"
            />
            */}
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Scan QR or use UPI ID</p>
            <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
              <code className="text-sm font-mono">{upiId}</code>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={copyUpiId}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            This is an alpha testing version. Your support helps us build better features and keep the service running.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonateModal;
