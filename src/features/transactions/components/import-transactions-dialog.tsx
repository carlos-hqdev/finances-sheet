"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ChevronRight,
  DownloadCloud,
  FileSearch,
  Pencil,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { useSession } from "@/shared/lib/auth-client";
import { parseCSV } from "@/shared/lib/parsers/csv-parser";
import { parseOFX } from "@/shared/lib/parsers/ofx-parser";
import { parsePdfFile } from "@/shared/lib/parsers/pdf-parser";
import {
  type ImportTransactionInput,
  processImportedTransactions,
} from "../actions/import-actions";
import type { ParsedTransaction } from "../types";

interface ImportTransactionsDialogProps {
  accounts: { id: string; name: string; type: string }[];
  categories: { id: string; name: string }[];
}

export function ImportTransactionsDialog({
  accounts,
  categories,
}: ImportTransactionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [pdfPassword, setPdfPassword] = useState<string>("");
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [reviewMode, setReviewMode] = useState<"detailed" | "grouped">(
    "grouped",
  );
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const session = useSession();
  const cpf = (session.data?.user as any)?.cpf;

  // Pre-preencher senha com CPF (sem pontuação) se disponível
  useEffect(() => {
    if (cpf) {
      setPdfPassword(cpf.replace(/\D/g, ""));
    }
  }, [cpf]);

  const resetState = () => {
    setStep(1);
    setParsedData([]);
    setFiles([]);
    setSelectedAccountId("");
    setIsPasswordRequired(false);
    setProcessingStatus("");
    setReviewMode("grouped");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    setOpen(newOpen);
  };

  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAccountId) {
      toast.error("Por favor, selecione a conta de destino primeiro.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;

    setFiles(selectedFiles);
    setIsPasswordRequired(false);

    // Iniciar processamento
    const allTransactions: ParsedTransaction[] = [];
    setIsLoading(true);

    for (let i = 0; i < selectedFiles.length; i++) {
      setProcessingStatus(`${i + 1}/${selectedFiles.length}`);
      const result = await processSingleFile(
        selectedFiles[i],
        pdfPassword || cpf?.replace(/\D/g, "") || "",
      );

      if (result.isPasswordRequired) {
        setIsPasswordRequired(true);
        setIsLoading(false);
        return;
      }

      if (result.data) {
        allTransactions.push(...result.data);
      }
    }

    setParsedData(allTransactions);
    if (allTransactions.length > 0) {
      setStep(2);
      toast.success(`${allTransactions.length} transações identificadas!`);
    } else {
      toast.warning("Nenhuma transação foi identificada no(s) arquivo(s) selecionado(s).");
    }
    setIsLoading(false);
    setProcessingStatus("");
  };

  const processSingleFile = async (
    selectedFile: File,
    password?: string,
  ): Promise<{ data?: ParsedTransaction[]; isPasswordRequired?: boolean }> => {
    try {
      let data: ParsedTransaction[] = [];

      if (selectedFile.name.toLowerCase().endsWith(".ofx")) {
        const text = await selectedFile.text();
        data = parseOFX(text, cpf).map(t => ({ ...t, source: selectedFile.name }));
      } else if (selectedFile.name.toLowerCase().endsWith(".csv")) {
        const text = await selectedFile.text();
        const parsed = await parseCSV(text, cpf);
        data = parsed.map(t => ({ ...t, source: selectedFile.name }));
      } else if (selectedFile.name.toLowerCase().endsWith(".pdf")) {
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          data = (await parsePdfFile(arrayBuffer, cpf, password)).map(t => ({ ...t, source: selectedFile.name }));
        } catch (err: any) {
          if (err.name === "PasswordException") {
            return { isPasswordRequired: true };
          }
          throw err;
        }
      }

      return { data };
    } catch (err: any) {
      toast.error(`Erro no arquivo ${selectedFile.name}: ${err.message}`);
      return {};
    }
  };

  const handleRetryWithPassword = async () => {
    const allTransactions: ParsedTransaction[] = [];
    setIsLoading(true);
    setIsPasswordRequired(false);

    for (let i = 0; i < files.length; i++) {
      setProcessingStatus(`${i + 1}/${files.length}`);
      const result = await processSingleFile(files[i], pdfPassword);

      if (result.isPasswordRequired) {
        setIsPasswordRequired(true);
        setIsLoading(false);
        toast.error("Senha incorreta para algum dos arquivos.");
        return;
      }

      if (result.data) {
        allTransactions.push(...result.data);
      }
    }

    setParsedData(allTransactions);
    if (allTransactions.length > 0) {
      setStep(2);
      toast.success(`${allTransactions.length} transações identificadas!`);
    } else {
      toast.warning("Nenhuma transação foi identificada no(s) arquivo(s) selecionado(s).");
    }
    setIsLoading(false);
    setProcessingStatus("");
  };

  const handleUpdateItem = (
    id: string,
    updates: Partial<ParsedTransaction>,
  ) => {
    setParsedData((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  };

  const handleUpdateGroup = (
    oldDescription: string,
    updates: Partial<ParsedTransaction>,
  ) => {
    setParsedData((prev) =>
      prev.map((p) => {
        if (p.description === oldDescription) {
          const newUpdates = { ...updates };
          if (updates.type === "TRANSFER") {
            newUpdates.isInternalTransfer = true;
          } else if (updates.type) {
            newUpdates.isInternalTransfer = false;
          }
          return { ...p, ...newUpdates };
        }
        return p;
      }),
    );
  };

  const handleApplyMatch = (matchId: string, suggestedDescription: string) => {
     handleUpdateItem(matchId, { description: suggestedDescription });
     toast.success("Descrição atualizada com base no confronto de arquivos!");
  };

  const groupedData = useMemo(() => {
    const groups: Record<
      string,
      {
        description: string;
        count: number;
        totalAmount: number;
        categoryId?: string;
        type: string;
        isInternalTransfer: boolean;
        destinationAccountId?: string;
        paymentMethod: string;
      }
    > = {};

    parsedData.forEach((trx) => {
      if (!groups[trx.description]) {
        groups[trx.description] = {
          description: trx.description,
          count: 0,
          totalAmount: 0,
          categoryId: trx.categoryId ?? undefined,
          type: trx.type,
          isInternalTransfer: trx.isInternalTransfer ?? false,
          destinationAccountId: trx.destinationAccountId ?? undefined,
          paymentMethod: trx.paymentMethod || "OTHER",
        };
      }
      groups[trx.description].count++;
      groups[trx.description].totalAmount += trx.amount;
      if (trx.categoryId) groups[trx.description].categoryId = trx.categoryId;
      if (trx.destinationAccountId)
        groups[trx.description].destinationAccountId = trx.destinationAccountId;
    });

    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [parsedData]);

  // Encontrar sugestões de merge (mesmo valor e data, arquivos diferentes)
  const matchSuggestions = useMemo(() => {
    const suggestions: Record<string, { suggestedDescription: string, fromFile: string }> = {};
    
    parsedData.forEach(target => {
       // Procurar alguém com mesmo valor e data em arquivo diferente
       const match = parsedData.find(other => 
         other.id !== target.id && 
         other.amount === target.amount &&
         format(other.date, "yyyy-MM-dd") === format(target.date, "yyyy-MM-dd") &&
         other.source !== target.source &&
         other.description.length > target.description.length // Sugerir a maior descrição
       );

       if (match) {
         suggestions[target.id] = {
           suggestedDescription: match.description,
           fromFile: match.source || "outro arquivo"
         };
       }
    });
    
    return suggestions;
  }, [parsedData]);

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const toImport: ImportTransactionInput[] = parsedData.map((t) => ({
        accountId: selectedAccountId,
        date: t.date.toISOString(),
        amount: t.amount,
        description: t.description,
        type: t.type,
        categoryId: t.categoryId,
        destinationAccountId: t.destinationAccountId,
        paymentMethod: t.paymentMethod,
        notes: "Importado via sistema",
      }));

      const result = await processImportedTransactions(toImport);
      if (result.error) throw new Error(result.error);

      toast.success(result.message);
      setOpen(false);
      resetState();
    } catch (e: any) {
      toast.error(e.message || "Erro fatal ao tentar importar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-primary/20 hover:bg-primary/5 shadow-sm text-primary font-medium"
        >
          <UploadCloud className="h-4 w-4" />
          Importação Inteligente
        </Button>
      </DialogTrigger>
      <DialogContent
        className={
          step === 2
            ? "max-w-[90vw] md:max-w-6xl lg:max-w-7xl h-[90vh] flex flex-col overflow-hidden"
            : "max-w-xl"
        }
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            {step === 1 ? "Importar Lançamentos" : "Revisar Transações"}
            {processingStatus && (
              <Badge variant="outline" className="ml-2 animate-pulse">
                Processando {processingStatus}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Selecione a conta bancária e faça o upload de um ou mais extratos (.OFX, .CSV, .PDF)."
              : "Organize suas transações. Você pode editar por grupos de descrição para ganhar tempo."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 pt-4 animate-in fade-in zoom-in-95 duration-200">
            {!cpf && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-md text-xs flex gap-2 items-start">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Dica de Produtividade</p>
                  <p>
                    Preencher seu CPF no perfil ativa o reconhecimento
                    automático de transferências entre suas próprias contas.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                1. Conta de Destino
              </Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="w-full h-12 bg-background border-primary/20">
                  <SelectValue placeholder="Selecione a conta de destino..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                2. Arquivos (Arraste múltiplos arquivos)
              </Label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all
                         ${selectedAccountId ? "border-primary/40 hover:border-primary hover:bg-primary/5 cursor-pointer group" : "border-border/50 bg-muted/20 opacity-50 cursor-not-allowed"}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".ofx,.csv,.pdf"
                  disabled={!selectedAccountId || isLoading}
                  onChange={handleFileDrop}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <DownloadCloud
                  className={`h-12 w-12 mx-auto mb-4 transition-colors ${isLoading ? "animate-bounce text-primary" : "text-muted-foreground group-hover:text-primary"}`}
                />
                <p className="text-sm font-medium text-foreground">
                  {isLoading
                    ? `Processando ${processingStatus}...`
                    : "Solte seus arquivos aqui ou clique para selecionar"}
                </p>

                {isPasswordRequired && files.length > 0 && (
                  <div
                    className="mt-6 px-4 py-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3 z-20 relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Label className="text-[11px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Arquivo Protegido Detectado
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Senha do PDF (ex: CPF)"
                        value={pdfPassword}
                        onChange={(e) => setPdfPassword(e.target.value)}
                        className="h-9 text-xs text-center bg-background border-amber-300"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleRetryWithPassword}
                        className="h-9 bg-amber-600 hover:bg-amber-700"
                      >
                        Tentar
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-4">
                  {files.length > 0
                    ? `${files.length} arquivos selecionados`
                    : "PDF, OFX ou CSV (Máx 5MB/arquivo)"}
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <Tabs
            value={reviewMode}
            onValueChange={(v: any) => setReviewMode(v)}
            className="flex-1 flex flex-col mt-4 min-h-0"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1">
              <TabsTrigger value="grouped" className="text-xs font-semibold">
                Visão Agrupada ({groupedData.length} grupos)
              </TabsTrigger>
              <TabsTrigger value="detailed" className="text-xs font-semibold">
                Visão Detalhada ({parsedData.length} itens)
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="grouped"
              className="flex-1 overflow-hidden border rounded-xl bg-card m-0 mt-2 data-[state=active]:flex flex-col"
            >
              <div className="h-full overflow-y-auto divide-y p-1">
                {groupedData.map((group) => (
                  <div
                    key={group.description}
                    className="p-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2 group/title">
                        {editingGroup === group.description ? (
                          <div className="flex items-center gap-2 w-full pr-4">
                             <Input 
                               autoFocus
                               value={editValue}
                               onChange={(e) => setEditValue(e.target.value)}
                               className="h-7 text-xs"
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   handleUpdateGroup(group.description, { description: editValue });
                                   setEditingGroup(null);
                                 }
                               }}
                               onBlur={() => setEditingGroup(null)}
                             />
                          </div>
                        ) : (
                          <>
                            <span className="font-semibold text-foreground text-sm leading-tight">
                              {group.description}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 opacity-0 group-hover/title:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingGroup(group.description);
                                setEditValue(group.description);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        {group.count} ocorrências
                      </span>
                    </div>
                    <div className="w-27.5 text-right shrink-0">
                      <span
                        className={`font-bold text-sm ${group.totalAmount < 0 ? "text-red-500" : "text-emerald-500"}`}
                      >
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Math.abs(group.totalAmount))}
                      </span>
                    </div>
                    <div className="w-[140px] shrink-0">
                      <Select
                        value={group.type}
                        onValueChange={(val: any) =>
                          handleUpdateGroup(group.description, { type: val })
                        }
                      >
                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase bg-muted/50 border-none w-full flex justify-between items-center [&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCOME">Receita</SelectItem>
                          <SelectItem value="EXPENSE">Despesa</SelectItem>
                          <SelectItem value="TRANSFER">
                            Transferência
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-[220px] col-span-3">
                      {group.type === "TRANSFER" ? (
                        <Select
                          value={group.destinationAccountId || ""}
                          onValueChange={(val) =>
                            handleUpdateGroup(group.description, {
                              destinationAccountId: val,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs border-primary/20 w-full">
                            <SelectValue placeholder="Conta Destino..." />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter((a) => a.id !== selectedAccountId)
                              .map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={group.categoryId || ""}
                          onValueChange={(val) =>
                            handleUpdateGroup(group.description, {
                              categoryId: val,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs border-primary/20 w-full">
                            <SelectValue placeholder="Definir categoria..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="w-[140px] shrink-0">
                      <Select
                        value={group.paymentMethod}
                        onValueChange={(val: any) =>
                          handleUpdateGroup(group.description, { paymentMethod: val })
                        }
                      >
                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase bg-muted/50 border-none w-full">
                          <SelectValue placeholder="Método..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="DEBIT_CARD">Débito</SelectItem>
                          <SelectItem value="CREDIT_CARD">Crédito</SelectItem>
                          <SelectItem value="BOLETO">Boleto</SelectItem>
                          <SelectItem value="TRANSFER">Transferência</SelectItem>
                          <SelectItem value="CASH">Dinheiro</SelectItem>
                          <SelectItem value="OTHER">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent
              value="detailed"
              className="flex-1 overflow-hidden border rounded-xl bg-card m-0 mt-2 data-[state=active]:flex flex-col"
            >
              <div className="h-full overflow-y-auto divide-y p-1">
                {parsedData
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((trx) => (
                    <div
                      key={trx.id}
                      className="p-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs bg-muted px-1.5 py-0.5 rounded">
                            {format(trx.date, "dd MMM", { locale: ptBR })}
                          </span>
                          <div className="flex items-center gap-1 group/desc">
                            {editingId === trx.id ? (
                               <Input 
                                 autoFocus
                                 value={editValue}
                                 onChange={(e) => setEditValue(e.target.value)}
                                 className="h-6 text-[10px] w-48"
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                     handleUpdateItem(trx.id, { description: editValue });
                                     setEditingId(null);
                                   }
                                 }}
                                 onBlur={() => setEditingId(null)}
                               />
                            ) : (
                              <>
                                <span className="text-[11px] font-semibold text-foreground truncate max-w-[200px]">
                                  {trx.description}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-4 w-4 opacity-0 group-hover/desc:opacity-100 transition-opacity"
                                  onClick={() => {
                                    setEditingId(trx.id);
                                    setEditValue(trx.description);
                                  }}
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </Button>
                              </>
                            )}
                          </div>
                          {matchSuggestions[trx.id] && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[9px] gap-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                              onClick={() => handleApplyMatch(trx.id, matchSuggestions[trx.id].suggestedDescription)}
                            >
                              <FileSearch className="h-3 w-3" />
                              Confrontar PDF
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="w-[110px] text-right shrink-0">
                        <span
                          className={`font-bold text-sm ${trx.amount < 0 ? "text-red-500" : "text-emerald-500"}`}
                        >
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Math.abs(trx.amount))}
                        </span>
                      </div>
                      <div className="w-[130px] shrink-0">
                        <Select
                          value={trx.type}
                          onValueChange={(val: any) =>
                            handleUpdateItem(trx.id, {
                              type: val,
                              isInternalTransfer: val === "TRANSFER",
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs border-dashed w-full [&>span]:truncate">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INCOME">Receita</SelectItem>
                            <SelectItem value="EXPENSE">Despesa</SelectItem>
                            <SelectItem value="TRANSFER">
                              Transferência
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-[180px] shrink-0">
                        {trx.type === "TRANSFER" ? (
                          <Select
                            value={trx.destinationAccountId || ""}
                            onValueChange={(val) =>
                              handleUpdateItem(trx.id, {
                                destinationAccountId: val,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Destino..." />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts
                                .filter((a) => a.id !== selectedAccountId)
                                .map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={trx.categoryId || ""}
                            onValueChange={(val) =>
                              handleUpdateItem(trx.id, { categoryId: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Categoria..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="w-[130px] shrink-0">
                        <Select
                          value={trx.paymentMethod || "OTHER"}
                          onValueChange={(val: any) =>
                            handleUpdateItem(trx.id, { paymentMethod: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs border-dashed w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="DEBIT_CARD">Débito</SelectItem>
                            <SelectItem value="CREDIT_CARD">Crédito</SelectItem>
                            <SelectItem value="BOLETO">Boleto</SelectItem>
                            <SelectItem value="TRANSFER">Transferência</SelectItem>
                            <SelectItem value="CASH">Dinheiro</SelectItem>
                            <SelectItem value="OTHER">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="mt-6 border-t pt-4">
          {step === 2 && (
            <div className="w-full flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={resetState}
                disabled={isLoading}
                className="text-muted-foreground hover:text-red-500"
              >
                Cancelar e Limpar
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 font-bold"
              >
                {isLoading
                  ? "Processando..."
                  : `Salvar ${parsedData.length} Lançamentos`}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
