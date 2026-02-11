import { useCallback, useState } from "react";
import { Upload, FileCheck, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type DropzoneStatus = "idle" | "parsing" | "success" | "error";

interface FileDropzoneProps {
  accept: string;
  label: string;
  status: DropzoneStatus;
  errorMessage?: string;
  onFile: (file: File) => void;
}

export function FileDropzone({ accept, label, status, errorMessage, onFile }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      e.target.value = "";
    },
    [onFile]
  );

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
        dragOver && "border-primary bg-primary/5",
        status === "idle" && "border-muted-foreground/25 hover:border-primary/50",
        status === "parsing" && "border-primary/40 bg-primary/5 pointer-events-none",
        status === "success" && "border-green-500/50 bg-green-500/5",
        status === "error" && "border-destructive/50 bg-destructive/5"
      )}
    >
      <input type="file" accept={accept} className="hidden" onChange={handleChange} disabled={status === "parsing"} />

      {status === "idle" && (
        <>
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </>
      )}
      {status === "parsing" && (
        <>
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="text-sm text-primary">Analyse en cours…</span>
        </>
      )}
      {status === "success" && (
        <>
          <FileCheck className="h-8 w-8 text-green-500" />
          <span className="text-sm text-green-600">Fichier analysé avec succès</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-8 w-8 text-destructive" />
          <span className="text-sm text-destructive">{errorMessage || "Erreur lors de l'analyse"}</span>
        </>
      )}
    </label>
  );
}
