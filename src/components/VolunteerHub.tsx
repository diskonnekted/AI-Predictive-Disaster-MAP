import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Truck,
    Droplets,
    Heart,
    Utensils,
    Plus,
    MapPin,
    Phone,
    ShieldCheck,
    Search,
    CheckCircle2,
    Zap,
    Loader2,
    AlertCircle,
    Info,
    ShieldAlert
} from 'lucide-react';
// import { pipeline } from '@huggingface/transformers'; // Moved to dynamic import for safety
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { sanitizeInput } from '@/utils/security';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Resource {
    id: string;
    type: 'vehicle' | 'food' | 'water' | 'medical' | 'other';
    name: string;
    location: string;
    contact: string;
    status: 'available' | 'in-use' | 'needed';
    description: string;
}

interface VolunteerHubProps {
    language?: 'en' | 'id';
}

const VolunteerHub: React.FC<VolunteerHubProps> = ({ language = 'id' }) => {
    const t = {
        en: {
            title: "COMMUNITY RESOURCE <span class='text-primary'>HUB</span>",
            subtitle: "Coordination & Relief Management",
            registerButton: "LIST NEW RESOURCE",
            tabResources: "RESOURCES",
            tabAnalysis: "ML RELIEF ANALYSIS",
            analysisTitle: "Community Report Signal Analysis",
            analysisPlaceholder: "Paste community emergency messages here for ML signal classification...",
            modelLabel: "Model: mobilebert-uncased-mnli (Local)",
            analyzeButton: "ANALYZE SIGNAL",
            loadingModel: "LOADING MODEL...",
            analyzing: "ANALYZING...",
            initializingNN: "INITIALIZING NEURAL NETWORK...",
            mlResultTitle: "ML SIGNAL DECODE RESULTS",
            addFormTitle: "List New Resource",
            typeLabel: "Type",
            types: {
                vehicle: "Vehicle / Transport",
                food: "Food Supplies",
                water: "Drinking Water",
                medical: "Medical Aid",
                other: "Other Material Aid"
            },
            nameLabel: "Name / Title",
            namePlaceholder: "e.g., 4x4 Truck, Doctor, etc.",
            contactLabel: "Contact No.",
            locationLabel: "Location",
            locationPlaceholder: "Area / Village Name",
            descriptionLabel: "Description",
            descriptionPlaceholder: "Brief details about the resource...",
            cancel: "Cancel",
            post: "Post Listing",
            liveResourcesTitle: "Live Resource Directory",
            contact: "CONTACT",
            statsTitle: "Volunteer Statistics",
            activeVolunteers: "Active Volunteers",
            rubberBoats: "Rubber Boats",
            medicalTeams: "Medical Teams",
            recognized: "RECOGNIZED",
            registeredVolunteer: "YOU ARE A REGISTERED VOLUNTEER",
            joinButton: "JOIN AS VOLUNTEER",
            regTitle: "VOLUNTEER <span class='text-primary'>REGISTRATION</span>",
            regSubtitle: "Join the community rescue force",
            fullName: "Full Name",
            namePlaceholderInput: "Enter your name",
            phone: "Phone Number",
            skills: "Skills / Experience",
            skillsPlaceholder: "e.g., Swimming, Medical, Driving",
            sendActivate: "SEND & ACTIVATE",
            guidelinesTitle: "Relief Guidelines",
            guide1: "Always verify identity before providing location details.",
            guide2: "Prioritize rescue for children, elderly, and those with medical conditions.",
            guide3: "Report any fake listings to the admin team immediately.",
            welcomeHeader: "Welcome aboard, {name}!",
            welcomeDesc: "You are now registered as an active volunteer.",
            fillRequired: "Please fill in required fields",
            successList: "Resource listed successfully",
            fillNamePhone: "Please fill in your name and phone number",
            analysisComplete: "Analysis complete!",
            analysisError: "Error during analysis.",
            enterMessage: "Please enter a message to analyze.",
            modelFailed: "Failed to load NLP model."
        },
        id: {
            title: "PUSAT SUMBER DAYA <span class='text-primary'>KOMUNITAS</span>",
            subtitle: "Koordinasi & Manajemen Bantuan",
            registerButton: "DAFTARKAN SUMBER DAYA",
            tabResources: "SUMBER DAYA",
            tabAnalysis: "ML PENGIRIMAN BANTUAN",
            analysisTitle: "Analisis Sinyal Laporan Komunitas",
            analysisPlaceholder: "Tempel pesan darurat komunitas di sini untuk klasifikasi sinyal ML...",
            modelLabel: "Model: mobilebert-uncased-mnli (Lokal)",
            analyzeButton: "ANALISA SINYAL",
            loadingModel: "MEMUAT MODEL...",
            analyzing: "MENGANALISIS...",
            initializingNN: "MENGINISIALISASI JARINGAN NEURAL...",
            mlResultTitle: "HASIL DEKODE SINYAL ML",
            addFormTitle: "Daftar Sumber Daya Baru",
            typeLabel: "Jenis",
            types: {
                vehicle: "Kendaraan / Transportasi",
                food: "Pasokan Makanan",
                water: "Air Minum",
                medical: "Bantuan Medis",
                other: "Bantuan Material Lainnya"
            },
            nameLabel: "Nama / Judul",
            namePlaceholder: "mis. Truk 4x4, Dokter, dll.",
            contactLabel: "No. Kontak",
            locationLabel: "Lokasi",
            locationPlaceholder: "Area / Nama Desa",
            descriptionLabel: "Deskripsi",
            descriptionPlaceholder: "Detail singkat mengenai sumber daya...",
            cancel: "Batal",
            post: "Posting Daftar",
            liveResourcesTitle: "Daftar Sumber Daya Langsung",
            contact: "KONTAK",
            statsTitle: "Statistik Relawan",
            activeVolunteers: "Relawan Aktif",
            rubberBoats: "Perahu Karet",
            medicalTeams: "Tim Medis",
            recognized: "DIAKUI",
            registeredVolunteer: "ANDA ADALAH RELAWAN TERDAFTAR",
            joinButton: "BERGABUNG SEBAGAI RELAWAN",
            regTitle: "PENDAFTARAN <span class='text-primary'>RELAWAN</span>",
            regSubtitle: "Bergabunglah dengan pasukan penyelamat komunitas",
            fullName: "Nama Lengkap",
            namePlaceholderInput: "Masukkan nama Anda",
            phone: "Nomor Telepon",
            skills: "Keahlian / Pengalaman",
            skillsPlaceholder: "mis. Berenang, Medis, Mengemudi",
            sendActivate: "KIRIM & AKTIFKAN",
            guidelinesTitle: "Panduan Bantuan",
            guide1: "Selalu verifikasi identitas sebelum memberikan rincian lokasi.",
            guide2: "Prioritaskan penyelamatan untuk anak-anak, lansia, dan mereka yang memiliki kondisi medis.",
            guide3: "Laporkan setiap daftar palsu ke tim admin segera.",
            welcomeHeader: "Selamat datang, {name}!",
            welcomeDesc: "Anda sekarang terdaftar sebagai relawan aktif.",
            fillRequired: "Silakan isi kolom yang wajib diisi",
            successList: "Sumber daya berhasil didaftarkan",
            fillNamePhone: "Silakan isi nama dan nomor telepon Anda",
            analysisComplete: "Analisis sinyal selesai!",
            analysisError: "Terjadi kesalahan pada analisis sinyal.",
            enterMessage: "Tuliskan pesan laporan untuk dianalisis.",
            modelFailed: "Gagal memuat model NLP untuk analisis.",
            mlLabels: {
                'Rescue Needed': 'Butuh Penyelamatan',
                'Medical Emergency': 'Darurat Medis',
                'Food & Water Shortage': 'Kekurangan Logistik',
                'Flood Hazard': 'Potensi Banjir',
                'Fire Hazard': 'Potensi Kebakaran',
                'Landslide Hazard': 'Potensi Longsor',
                'Safe / Not Urgent': 'Aman / Normal'
            },
            contactSuccess: "Informasi kontak disalin ke papan klip!"
        },
        en: {
            title: "COMMUNITY RESOURCE <span class='text-primary'>HUB</span>",
            subtitle: "Coordination & Relief Management",
            registerButton: "LIST NEW RESOURCE",
            tabResources: "RESOURCES",
            tabAnalysis: "ML RELIEF ANALYSIS",
            analysisTitle: "Community Report Signal Analysis",
            analysisPlaceholder: "Paste community emergency messages here for ML signal classification...",
            modelLabel: "Model: mobilebert-uncased-mnli (Local)",
            analyzeButton: "ANALYZE SIGNAL",
            loadingModel: "LOADING MODEL...",
            analyzing: "ANALYZING...",
            initializingNN: "INITIALIZING NEURAL NETWORK...",
            mlResultTitle: "ML SIGNAL DECODE RESULTS",
            addFormTitle: "List New Resource",
            typeLabel: "Type",
            types: {
                vehicle: "Vehicle / Transport",
                food: "Food Supplies",
                water: "Drinking Water",
                medical: "Medical Aid",
                other: "Other Material Aid"
            },
            nameLabel: "Name / Title",
            namePlaceholder: "e.g., 4x4 Truck, Doctor, etc.",
            contactLabel: "Contact No.",
            locationLabel: "Location",
            locationPlaceholder: "Area / Village Name",
            descriptionLabel: "Description",
            descriptionPlaceholder: "Brief details about the resource...",
            cancel: "Cancel",
            post: "Post Listing",
            liveResourcesTitle: "Live Resource Directory",
            contact: "CONTACT",
            contactSuccess: "Contact information copied to clipboard!",
            statsTitle: "Banjarnegara Volunteer Stats",
            activeVolunteers: "Active Volunteers",
            rubberBoats: "Rubber Boats",
            medicalTeams: "Medical Teams",
            recognized: "RECOGNIZED",
            registeredVolunteer: "REGISTERED VOLUNTEER",
            joinButton: "JOIN AS VOLUNTEER",
            regTitle: "VOLUNTEER <span class='text-primary'>REGISTRATION</span>",
            regSubtitle: "Join the emergency response frontline",
            fullName: "Full Name",
            namePlaceholderInput: "Enter your name",
            phone: "Phone Number",
            skills: "Skills / Experience",
            skillsPlaceholder: "e.g., Evacuation, Medical, Logistics",
            sendActivate: "SEND & ACTIVATE",
            guidelinesTitle: "Coordination Guidelines",
            guide1: "Always verify identity before sharing detailed location info.",
            guide2: "Prioritize rescue requests for vulnerable groups (Elderly, Children).",
            guide3: "Use HT radio communication if cellular signal is unstable.",
            welcomeHeader: "Welcome aboard, {name}!",
            welcomeDesc: "You are now part of the coordinated volunteer system.",
            fillRequired: "Please fill in all required fields",
            successList: "Resource successfully added to coordination directory",
            fillNamePhone: "Name and phone number are required",
            analysisComplete: "Signal analysis complete!",
            analysisError: "Error during signal analysis.",
            enterMessage: "Enter a report message to analyze.",
            modelFailed: "Failed to load NLP model for analysis.",
            mlLabels: {
                'Rescue Needed': 'Rescue Needed',
                'Medical Emergency': 'Medical Emergency',
                'Food & Water Shortage': 'Logistics Shortage',
                'Flood Hazard': 'Flood Potential',
                'Fire Hazard': 'Fire Potential',
                'Landslide Hazard': 'Landslide Potential',
                'Safe / Not Urgent': 'Safe / Normal'
            }
        }
    };
    const l = t[language];

    const [resources, setResources] = useState<Resource[]>([
        {
            id: 'sample-1',
            type: 'vehicle',
            name: 'Truk 4x4 Offroad',
            location: 'Kecamatan Wanayasa',
            contact: '0812-xxxx-1234',
            status: 'available',
            description: 'Tersedia untuk evakuasi di medan berat atau pengiriman logistik ke area terisolasi.'
        },
        {
            id: 'sample-2',
            type: 'food',
            name: 'Dapur Umum Mandiri',
            location: 'Desa Karangkobar',
            contact: '0857-xxxx-5678',
            status: 'available',
            description: 'Menyediakan makanan siap saji untuk 200 porsi per hari bagi pengungsi.'
        },
        {
            id: 'sample-3',
            type: 'vehicle',
            name: 'Excavator Konstruksi',
            location: 'Kecamatan Pejawaran',
            contact: '0821-xxxx-9012',
            status: 'available',
            description: 'Alat berat siap digunakan untuk pembersihan sisa longsoran di jalan kabupaten.'
        },
        {
            id: 'sample-4',
            type: 'medical',
            name: 'Tim Medis Relawan',
            location: 'Puskesmas Banjarnegara 1',
            contact: '0821-xxxx-3344',
            status: 'available',
            description: 'Unit gawat darurat keliling dengan peralatan bantuan dasar medis.'
        }
    ]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [showVolunteerDialog, setShowVolunteerDialog] = useState(false);
    const [registrationData, setRegistrationData] = useState({
        name: '',
        phone: '',
        skills: ''
    });
    const [isVolunteer, setIsVolunteer] = useState(() => {
        return localStorage.getItem('is_volunteer') === 'true';
    });

    const [newResource, setNewResource] = useState<Partial<Resource>>({
        type: 'food',
        status: 'available'
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'vehicle': return <Truck className="h-5 w-5" />;
            case 'food': return <Utensils className="h-5 w-5" />;
            case 'water': return <Droplets className="h-5 w-5" />;
            case 'medical': return <Heart className="h-5 w-5" />;
            default: return <Plus className="h-5 w-5" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'vehicle': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'medical': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'food': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'water': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const [activeSection, setActiveSection] = useState<'resources' | 'analysis'>('resources');
    const [inputText, setInputText] = useState('');
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<any>(null);
    const classifierRef = useRef<any>(null);

    const categories = [
        'Rescue Needed',
        'Medical Emergency',
        'Food & Water Shortage',
        'Flood Hazard',
        'Fire Hazard',
        'Landslide Hazard',
        'Safe / Not Urgent'
    ];

    const loadModel = async () => {
        if (classifierRef.current) return classifierRef.current;
        setIsModelLoading(true);
        setLoadingProgress(10);
        try {
            const { pipeline } = await import('@huggingface/transformers');
            const classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli', {
                progress_callback: (p: any) => {
                    if (p.status === 'progress') {
                        setLoadingProgress(Math.round(p.progress));
                    }
                }
            });
            classifierRef.current = classifier;
            setIsModelLoading(false);
            return classifier;
        } catch (error) {
            console.error('Error loading NLP model:', error);
            toast.error(l.modelFailed);
            setIsModelLoading(false);
            return null;
        }
    };

    const analyzeSOS = async () => {
        if (!inputText.trim()) {
            toast.error(l.enterMessage);
            return;
        }
        setIsAnalyzing(true);
        try {
            const classifier = await loadModel();
            if (!classifier) {
                setIsAnalyzing(false);
                return;
            }
            const sanitized = sanitizeInput(inputText);
            const output = await classifier(sanitized, categories);
            setResults(output);
            toast.success(l.analysisComplete);
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error(l.analysisError);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getUrgencyColor = (label: string, score: number) => {
        if (label === 'Safe / Not Urgent') return 'bg-success/20 text-success border-success/30';
        if (score > 0.6) return 'bg-destructive/20 text-destructive border-destructive/30';
        if (score > 0.3) return 'bg-warning/20 text-warning border-warning/30';
        return 'bg-primary/20 text-primary border-primary/30';
    };

    const handleAddResource = () => {
        if (!newResource.name || !newResource.contact) {
            toast.error(l.fillRequired);
            return;
        }
        const resource: Resource = {
            id: Date.now().toString(),
            type: newResource.type as any,
            name: sanitizeInput(newResource.name || ''),
            location: sanitizeInput(newResource.location || 'Unknown'),
            contact: sanitizeInput(newResource.contact || ''),
            status: 'available',
            description: sanitizeInput(newResource.description || '')
        };
        setResources([resource, ...resources]);
        setShowAddForm(false);
        toast.success(l.successList);
    };

    const handleContact = (contact: string) => {
        navigator.clipboard.writeText(contact);
        toast.success(l.contactSuccess, {
            description: contact
        });
    };
    const handleJoinAsVolunteer = () => {
        if (!registrationData.name || !registrationData.phone) {
            toast.error(l.fillNamePhone);
            return;
        }
        setIsVolunteer(true);
        localStorage.setItem('is_volunteer', 'true');
        setShowVolunteerDialog(false);
        const sName = sanitizeInput(registrationData.name);
        toast.success(l.welcomeHeader.replace('{name}', sName), {
            description: l.welcomeDesc
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-foreground" dangerouslySetInnerHTML={{ __html: l.title }}></h1>
                    <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest flex items-center gap-2">
                        <Users className="h-4 w-4" /> {l.subtitle}
                    </p>
                </div>

                <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-primary hover:bg-primary/90 text-white font-black"
                >
                    <Plus className="mr-2 h-4 w-4" /> {l.registerButton}
                </Button>
            </div>

            <div className="flex items-center gap-2 mb-6 p-1 bg-muted/30 rounded-lg w-fit">
                <Button
                    variant={activeSection === 'resources' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveSection('resources')}
                    className="text-xs font-bold"
                >
                    <Truck className="h-3.5 w-3.5 mr-1" /> {l.tabResources}
                </Button>
                <Button
                    variant={activeSection === 'analysis' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveSection('analysis')}
                    className="text-xs font-bold"
                >
                    <Zap className="h-3.5 w-3.5 mr-1" /> {l.tabAnalysis}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {activeSection === 'analysis' ? (
                        <div className="space-y-6">
                            <Card className="p-6 glass border-primary/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <ShieldAlert className="h-16 w-16" />
                                </div>
                                <div className="space-y-4 relative z-10">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-primary" /> {l.analysisTitle}
                                    </h3>
                                    <Textarea
                                        placeholder={l.analysisPlaceholder}
                                        className="min-h-[150px] bg-background/50 border-primary/20"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tabular-nums">
                                            {l.modelLabel}
                                        </span>
                                        <Button
                                            onClick={analyzeSOS}
                                            disabled={isAnalyzing || isModelLoading}
                                            className="bg-primary font-bold shadow-lg shadow-primary/20"
                                        >
                                            {isAnalyzing || isModelLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 fill-current" />}
                                            {isModelLoading ? l.loadingModel : isAnalyzing ? l.analyzing : l.analyzeButton}
                                        </Button>
                                    </div>
                                    {isModelLoading && (
                                        <div className="space-y-2 pt-2">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span>{l.initializingNN}</span>
                                                <span>{loadingProgress}%</span>
                                            </div>
                                            <Progress value={loadingProgress} className="h-1" />
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {results && (
                                <Card className="p-6 glass border-success/20 animate-in zoom-in-95 duration-300">
                                    <h3 className="font-bold mb-6 text-sm uppercase flex items-center gap-2 underline underline-offset-4 decoration-primary">
                                        <CheckCircle2 className="h-5 w-5 text-success" /> {l.mlResultTitle}
                                    </h3>
                                    <div className="space-y-5">
                                        {results.labels.map((label: string, index: number) => {
                                            const score = results.scores[index];
                                            const percentage = Math.round(score * 100);
                                            return (
                                                <div key={label} className="space-y-2">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                        <Badge variant="outline" className={getUrgencyColor(label, score)}>
                                                            {l.mlLabels[label as keyof typeof l.mlLabels] || label}
                                                        </Badge>
                                                        <span>{percentage}%</span>
                                                    </div>
                                                    <Progress value={percentage} className={`h-1 ${score > 0.5 ? '[&>div]:bg-primary' : ''}`} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {showAddForm && (
                                <Card className="p-6 border-primary/20 bg-primary/5 animate-in slide-in-from-top-4">
                                    <h3 className="font-bold mb-4">{l.addFormTitle}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">{l.typeLabel}</label>
                                            <select
                                                className="w-full bg-background border border-border rounded-md p-2 text-sm"
                                                onChange={(e) => setNewResource({ ...newResource, type: e.target.value as any })}
                                                value={newResource.type}
                                            >
                                                <option value="vehicle">{l.types.vehicle}</option>
                                                <option value="food">{l.types.food}</option>
                                                <option value="water">{l.types.water}</option>
                                                <option value="medical">{l.types.medical}</option>
                                                <option value="other">{l.types.other}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">{l.nameLabel}</label>
                                            <Input
                                                placeholder={l.namePlaceholder}
                                                value={newResource.name}
                                                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">{l.contactLabel}</label>
                                            <Input
                                                placeholder="+62..."
                                                value={newResource.contact}
                                                onChange={(e) => setNewResource({ ...newResource, contact: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">{l.locationLabel}</label>
                                            <Input
                                                placeholder={l.locationPlaceholder}
                                                value={newResource.location}
                                                onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">{l.descriptionLabel}</label>
                                            <Input
                                                placeholder={l.descriptionPlaceholder}
                                                value={newResource.description}
                                                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-6">
                                        <Button variant="ghost" onClick={() => setShowAddForm(false)}>{l.cancel}</Button>
                                        <Button onClick={handleAddResource}>{l.post}</Button>
                                    </div>
                                </Card>
                            )}

                            <div className="space-y-4">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Search className="h-4 w-4" /> {l.liveResourcesTitle}
                                </h3>

                                <div className="grid grid-cols-1 gap-3">
                                    {resources.map((item) => (
                                        <Card key={item.id} className="p-4 bg-white/50 dark:bg-black/20 border-border/10 hover:border-primary/30 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex gap-4">
                                                    <div className={`p-3 rounded-xl border ${getTypeColor(item.type)}`}>
                                                        {getIcon(item.type)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold">{item.name}</h4>
                                                            <Badge variant="outline" className="text-[10px] h-4 uppercase">{item.type}</Badge>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" /> {item.location}
                                                            </p>
                                                            <p className="text-xs text-primary font-bold flex items-center gap-1">
                                                                <Phone className="h-3 w-3" /> {item.contact}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm mt-3 text-foreground/80 leading-snug">{item.description}</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="text-[10px] font-bold"
                                                    onClick={() => handleContact(item.contact)}
                                                >
                                                    {l.contact}
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="p-5 bg-primary/5 border-primary/10 overflow-hidden relative">
                        <div className="absolute -top-6 -right-6 opacity-5 rotate-12">
                            <Users className="h-32 w-32" />
                        </div>
                        <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" /> {l.statsTitle}
                        </h4>
                        <div className="space-y-4 relative z-10">
                            {[
                                { label: l.activeVolunteers, value: '1,248', icon: Users },
                                { label: l.rubberBoats, value: '42', icon: Truck },
                                { label: l.medicalTeams, value: '15', icon: Heart }
                            ].map((stat, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-background/40 backdrop-blur-md border border-white/10 rounded-xl hover:bg-background/60 transition-smooth group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-smooth">
                                            <stat.icon className="h-4 w-4 text-primary" />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">{stat.label}</p>
                                    </div>
                                    <p className="text-xl font-black italic tracking-tighter">{stat.value}</p>
                                </div>
                            ))}
                            
                            {isVolunteer ? (
                                <div className="p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-3 animate-in zoom-in-95 group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-success/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-smooth duration-1000" />
                                    <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                                    <div>
                                        <p className="text-sm font-black text-success uppercase italic leading-none mb-1">{l.recognized}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-tight">{l.registeredVolunteer}</p>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setShowVolunteerDialog(true)}
                                    className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-black italic uppercase tracking-tighter h-12 shadow-xl shadow-primary/20 group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <Users className="h-4 w-4" /> {l.joinButton}
                                    </span>
                                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-smooth duration-500" />
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* Volunteer Registration Dialog */}
                    <Dialog open={showVolunteerDialog} onOpenChange={setShowVolunteerDialog}>
                        <DialogContent className="max-w-md bg-background border-primary/20">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black italic tracking-tighter" dangerouslySetInnerHTML={{ __html: l.regTitle }}>
                                </DialogTitle>
                                <DialogDescription className="font-bold text-[10px] uppercase tracking-widest">
                                    {l.regSubtitle}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase">{l.fullName}</Label>
                                    <Input
                                        placeholder={l.namePlaceholderInput}
                                        className="h-12 font-bold"
                                        value={registrationData.name}
                                        onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase">{l.phone}</Label>
                                    <Input
                                        placeholder="+62..."
                                        className="h-12 font-bold"
                                        value={registrationData.phone}
                                        onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase">{l.skills}</Label>
                                    <Input
                                        placeholder={l.skillsPlaceholder}
                                        className="h-12 font-bold"
                                        value={registrationData.skills}
                                        onChange={(e) => setRegistrationData({ ...registrationData, skills: e.target.value })}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest"
                                    onClick={handleJoinAsVolunteer}
                                >
                                    {l.sendActivate}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Card className="p-5 glass border-border/10 bg-accent/5">
                        <h4 className="font-bold text-sm mb-3">{l.guidelinesTitle}</h4>
                        <ul className="space-y-3">
                            <li className="text-xs flex gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span className="text-muted-foreground">{l.guide1}</span>
                            </li>
                            <li className="text-xs flex gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span className="text-muted-foreground">{l.guide2}</span>
                            </li>
                            <li className="text-xs flex gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span className="text-muted-foreground">{l.guide3}</span>
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default VolunteerHub;
