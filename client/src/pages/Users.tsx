import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Trash2, Shield, Wrench, UserCog, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Funcionario {
  id: number;
  nome: string;
  pin: string;
  cargo: string;
  permNovaOs: boolean;
  permDiagnostico: boolean;
  permManutencao: boolean;
  permQualidade: boolean;
  permAguardandoPeca: boolean;
  permAguardandoAprovacao: boolean;
  permAcompanharOs: boolean;
  permLaudoTecnico: boolean;
  ativo: boolean;
}

const CARGOS = [
  "Auxiliar Mecânico",
  "Mecânico",
  "Soldador",
  "Soldador Mecânico",
  "Borracheiro",
  "Eletricista",
  "QUALIDADE",
  "Analista",
  "TÉCNICO ATRUCK",
  "TÉCNICO SUZANO",
];

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<Funcionario | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Funcionario>>({});

  const { data: funcionarios = [], isLoading } = useQuery<Funcionario[]>({
    queryKey: ["/api/funcionarios"],
    queryFn: async () => {
      const res = await fetch("/api/funcionarios");
      if (!res.ok) throw new Error("Erro ao carregar funcionários");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Funcionario>) => {
      const res = await fetch("/api/funcionarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar funcionário");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
      setIsCreating(false);
      setFormData({});
      toast({ title: "Funcionário criado com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Funcionario> }) => {
      const res = await fetch(`/api/funcionarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao atualizar funcionário");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
      setEditingUser(null);
      setFormData({});
      toast({ title: "Funcionário atualizado com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/funcionarios/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir funcionário");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
      toast({ title: "Funcionário excluído com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const filteredUsers = funcionarios.filter(
    (f) =>
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      f.cargo.toLowerCase().includes(search.toLowerCase()) ||
      f.pin.includes(search)
  );

  const openEditDialog = (user: Funcionario) => {
    setEditingUser(user);
    setFormData({ ...user });
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setFormData({
      nome: "",
      pin: "",
      cargo: "Auxiliar Mecânico",
      permNovaOs: true,
      permDiagnostico: false,
      permManutencao: true,
      permQualidade: false,
      permAguardandoPeca: true,
      permAguardandoAprovacao: true,
      permAcompanharOs: true,
      permLaudoTecnico: false,
      ativo: true,
    });
  };

  const handleSave = () => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const permLabels: { key: keyof Funcionario; label: string }[] = [
    { key: "permNovaOs", label: "Nova OS" },
    { key: "permDiagnostico", label: "Diagnóstico" },
    { key: "permManutencao", label: "Manutenção" },
    { key: "permQualidade", label: "Qualidade" },
    { key: "permAguardandoPeca", label: "Aguardando Peça" },
    { key: "permAguardandoAprovacao", label: "Aguardando Aprovação" },
    { key: "permAcompanharOs", label: "Acompanhar OS" },
    { key: "permLaudoTecnico", label: "Laudo Técnico" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">
            Admin - Funcionários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os acessos e permissões da equipe ({funcionarios.length} cadastrados)
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 gap-2"
          onClick={openCreateDialog}
          data-testid="button-new-user"
        >
          <Plus className="w-4 h-4" /> Novo Funcionário
        </Button>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome, cargo ou PIN..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50" data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{user.nome}</div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                        {user.pin}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.cargo.includes("QUALIDADE") || user.cargo.includes("Analista") ? (
                          <Shield className="w-4 h-4 text-primary" />
                        ) : user.cargo.includes("TÉCNICO") ? (
                          <UserCog className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <Wrench className="w-4 h-4 text-slate-400" />
                        )}
                        {user.cargo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.permDiagnostico && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Diag</Badge>}
                        {user.permManutencao && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Manut</Badge>}
                        {user.permQualidade && <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200">Qual</Badge>}
                        {user.permLaudoTecnico && <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">Laudo</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.ativo
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {user.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Excluir ${user.nome}?`)) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser || isCreating} onOpenChange={(open) => { if (!open) { setEditingUser(null); setIsCreating(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={formData.nome || ""}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                data-testid="input-nome"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pin">PIN (4 dígitos)</Label>
                <Input
                  id="pin"
                  maxLength={4}
                  value={formData.pin || ""}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  data-testid="input-pin"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cargo">Cargo</Label>
                <select
                  id="cargo"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.cargo || ""}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  data-testid="select-cargo"
                >
                  {CARGOS.map((cargo) => (
                    <option key={cargo} value={cargo}>
                      {cargo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  data-testid="switch-ativo"
                />
                <span className={formData.ativo ? "text-green-600" : "text-red-600"}>
                  {formData.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Permissões</h4>
              <div className="grid grid-cols-2 gap-3">
                {permLabels.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm">{label}</span>
                    <Switch
                      checked={(formData[key] as boolean) ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                      data-testid={`switch-${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditingUser(null); setIsCreating(false); }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.nome || !formData.pin || formData.pin.length !== 4}
              data-testid="button-save"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
