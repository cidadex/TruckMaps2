import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  CheckSquare, 
  Clock, 
  Wrench, 
  ShieldCheck, 
  ClipboardList,
  AlertCircle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function CreateChecklistLayout() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("clipboard");
  const [newItem, setNewItem] = useState("");
  const [items, setItems] = useState<string[]>([]);

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, newItem.trim()]);
    setNewItem("");
  };

  const handleDeleteItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSave = () => {
    if (!title || items.length === 0) {
      toast({
        title: "Erro ao salvar",
        description: "Preencha o título e adicione pelo menos um item ao checklist.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Layout salvo com sucesso!",
      description: `O checklist "${title}" foi criado e já está disponível para uso.`,
    });
    
    // Simulate API delay then redirect back
    setTimeout(() => {
      setLocation("/preventive-maintenance");
    }, 1500);
  };

  const icons = [
    { value: "clipboard", label: "Prancheta", icon: ClipboardList },
    { value: "wrench", label: "Ferramenta", icon: Wrench },
    { value: "clock", label: "Relógio", icon: Clock },
    { value: "shield", label: "Segurança", icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-[1000px] mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <Button 
          variant="ghost" 
          className="w-fit pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/preventive-maintenance")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Manutenção Preventiva
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Criar Novo Layout de Checklist</h1>
        <p className="text-muted-foreground">Defina os itens e critérios para um novo padrão de inspeção.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Layout</CardTitle>
              <CardDescription>Dados básicos do checklist.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Checklist</Label>
                <Input 
                  id="title" 
                  placeholder="Ex: Revisão de Freios" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  placeholder="Descreva o objetivo deste checklist..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex gap-4">
                  {icons.map((item) => (
                    <div 
                      key={item.value}
                      className={`
                        cursor-pointer p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 w-24
                        ${icon === item.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-slate-300'}
                      `}
                      onClick={() => setIcon(item.value)}
                    >
                      <item.icon className="w-6 h-6" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itens de Verificação</CardTitle>
              <CardDescription>Adicione os pontos que devem ser inspecionados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="Digite um novo item para verificar..." 
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <Button onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>Nenhum item adicionado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border group hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-white">{index + 1}</Badge>
                          <span className="font-medium text-slate-700">{item}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total de Itens</span>
                  <span className="font-bold text-xl">{items.length}</span>
                </div>
                
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm text-amber-800">
                  <p className="flex gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    Ao salvar, este layout ficará disponível para todas as novas manutenções preventivas.
                  </p>
                </div>
              </div>

              <Button size="lg" className="w-full gap-2" onClick={handleSave}>
                <Save className="w-4 h-4" /> Salvar Layout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
