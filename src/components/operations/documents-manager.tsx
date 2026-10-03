"use client";

import * as React from "react";
import {
  getBranchDocumentsAction,
  createBranchDocumentAction,
} from "@/actions/operations-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type DocumentItem = Awaited<
  ReturnType<typeof getBranchDocumentsAction>
>[number];

export function DocumentsManager() {
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("POLICIES");
  const [fileUrl, setFileUrl] = React.useState("");
  const [fileType, setFileType] = React.useState("application/pdf");
  const [fileSize, setFileSize] = React.useState("1048576"); // 1MB default

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await getBranchDocumentsAction();
      setDocuments(data);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createBranchDocumentAction({
      title,
      category,
      fileUrl,
      fileType,
      fileSize: parseInt(fileSize, 10),
    });

    if (res.success) {
      toast.success("Document cataloged successfully");
      setIsOpen(false);
      setTitle("");
      setFileUrl("");
      fetchDocuments();
    } else {
      toast.error(res.error || "Failed to catalog document");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Branch Documents
          </h1>
          <p className="text-muted-foreground">
            Document depository for branch policies, legal records, and
            contracts
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Catalog Branch Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. 2026 Facility Lease Agreement"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POLICIES">
                      Policies and Guidelines
                    </SelectItem>
                    <SelectItem value="LEGAL">Legal and Compliance</SelectItem>
                    <SelectItem value="CONTRACTS">
                      Vendor and Lease Contracts
                    </SelectItem>
                    <SelectItem value="FACILITIES">
                      Facilities and Maintenance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Document URL</label>
                <Input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  required
                  placeholder="https://storage.company.com/docs/file.pdf"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">File Type</label>
                  <Input
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    required
                    placeholder="e.g. application/pdf"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    File Size (bytes)
                  </label>
                  <Input
                    type="number"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Save Document
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cataloged Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No documents uploaded yet
                  </TableCell>
                </TableRow>
              )}
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileText className="text-primary h-4 w-4" />
                      <span className="font-medium">{d.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{d.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {d.fileType}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(d.fileSize / 1024).toFixed(1)} KB
                  </TableCell>
                  <TableCell>{d.uploadedByUser?.name}</TableCell>
                  <TableCell>
                    {new Date(d.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
