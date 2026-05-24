import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, FileText, Phone, Shield } from 'lucide-react';

interface DisasterGuidelinesProps {
  language?: 'en' | 'id';
}

const DisasterGuidelines: React.FC<DisasterGuidelinesProps> = ({ language = 'id' }) => {
  const t = {
    en: {
      title: "SAFETY GUIDELINES",
      subtitle: "Emergency protocols and mitigation procedures",
      emergencyContacts: "Local Emergency Contacts",
      safetyGuideTitle: "Safety Guide:",
      riskLevel: "Risk Level:",
      high: "High",
      medium: "Medium",
      before: "Before",
      during: "During",
      after: "After",
      officialResources: "Official Resources",
      additionalResources: "Additional Indonesian Resources",
      bnpb: "BNPB (National Disaster Mgmt)",
      bpbd: "BPBD Banjarnegara",
      bmkg: "BMKG (Weather/Seismic)",
      pvmbg: "PVMBG (Volcanology)",
      guidelines: [
        {
          disaster: 'Landslide',
          icon: '🌋',
          severity: 'high',
          before: [
            'Recognize signs: unusual sounds like trees cracking or boulders knocking',
            'Watch for new cracks in plaster, tile, brick or foundations',
            'Maintain drainage systems and avoid planting near steep slopes',
            'Monitor heavy rainfall alerts from BMKG',
          ],
          during: [
            'Evacuate immediately to higher or stable ground',
            'Stay alert while driving - embankments are prone to landslides',
            'Curl into a tight ball and protect your head if escape is impossible',
            'Listen for unusual sounds that might indicate moving debris',
          ],
          after: [
            'Stay away from the slide area; there may be additional slides',
            'Check for injured or trapped persons near the slide',
            'Watch for flooding which may occur after a landslide',
            'Report broken utility lines to authorities',
          ],
          resources: [
            { name: 'ESDM Landslide Map', url: 'https://vsi.esdm.go.id/' },
          ],
        },
        {
          disaster: 'Flood',
          icon: '🌊',
          severity: 'high',
          before: [
            'Know the elevation of your property and nearest evacuation route',
            'Keep emergency supplies in a waterproof container',
            'Identify local community shelters',
            'Clear drains around your house and neighborhood',
          ],
          during: [
            'Move to higher ground immediately',
            'Avoid walking or driving through flood waters',
            'Turn off utilities at main switches if instructed',
            'Stay away from power lines and electrical wires',
          ],
          after: [
            'Avoid floodwaters; they may be contaminated',
            'Be aware of areas where waters have receded as roads may have weakened',
            'Clean and disinfect everything that got wet',
            'Watch out for snakes or animals that may have entered your home',
          ],
          resources: [
            { name: 'InaRisk BNPB', url: 'https://inarisk.bnpb.go.id/' },
          ],
        },
        {
          disaster: 'House Fire',
          icon: '🔥',
          severity: 'medium',
          before: [
            'Install smoke alarms on every level of your home',
            'Keep fire extinguishers in the kitchen and garage',
            'Plan and practice escape routes from every room',
            'Keep flammable items away from heat sources',
          ],
          during: [
            'Get out fast and stay out; never go back inside',
            'If there is smoke, crawl low under the smoke to escape',
            'If clothes catch fire: STOP, DROP, and ROLL',
            'Call the fire department from a safe area',
          ],
          after: [
            'Let firefighters ensure the house is safe to enter',
            'Wait for instructions before being allowed back in',
            'Take photos of damage for insurance claims',
            'Contact your insurance representative',
          ],
          resources: [
            { name: 'Fire Dept Portal', url: 'https://www.damkar.id/' },
          ],
        },
      ],
    },
    id: {
      title: "PANDUAN KESELAMATAN",
      subtitle: "Protokol darurat dan prosedur mitigasi",
      emergencyContacts: "Kontak Darurat Lokal",
      safetyGuideTitle: "Panduan Keselamatan:",
      riskLevel: "Tingkat Risiko:",
      high: "Tinggi",
      medium: "Sedang",
      before: "Sebelum",
      during: "Selama",
      after: "Sesudah",
      officialResources: "Sumber Daya Resmi",
      additionalResources: "Sumber Daya Tambahan Indonesia",
      bnpb: "BNPB (Nasional)",
      bpbd: "BPBD Banjarnegara",
      bmkg: "BMKG (Cuaca/Gempa)",
      pvmbg: "PVMBG (Vulkanologi)",
      guidelines: [
        {
          disaster: 'Tanah Longsor',
          icon: '🌋',
          severity: 'high',
          before: [
            'Kenali tanda: suara tidak biasa seperti pohon tumbang atau batu berbenturan',
            'Perhatikan retakan baru pada plester, ubin, bata, atau pondasi',
            'Rawat sistem drainase dan hindari menanam di lereng curam',
            'Pantau peringatan curah hujan tinggi dari BMKG',
          ],
          during: [
            'Segera evakuasi ke tempat yang lebih tinggi atau stabil',
            'Tetap waspada saat berkendara - tanggul rawan longsor',
            'Meringkuk seperti bola dan lindungi kepala jika tidak bisa lari',
            'Dengarkan suara gemuruh yang menandakan pergerakan puing',
          ],
          after: [
            'Jauhi area longsor; longsor susulan mungkin terjadi',
            'Periksa orang yang terluka atau terjebak di dekat lokasi',
            'Waspadai banjir yang mungkin terjadi setelah longsor',
            'Laporkan kabel utilitas yang putus ke pihak berwenang',
          ],
          resources: [
            { name: 'Peta Longsor PVMBG', url: 'https://vsi.esdm.go.id/' },
          ],
        },
        {
          disaster: 'Banjir',
          icon: '🌊',
          severity: 'high',
          before: [
            'Ketahui ketinggian properti Anda dan rute evakuasi terdekat',
            'Simpan perlengkapan darurat dalam wadah kedap air',
            'Identifikasi tempat penampungan komunitas lokal',
            'Bersihkan saluran air di sekitar rumah dan lingkungan',
          ],
          during: [
            'Segera pindah ke tempat yang lebih tinggi',
            'Hindari berjalan atau berkendara melewati air banjir',
            'Matikan utilitas di sakelar utama jika diinstruksikan',
            'Jauhi kabel listrik dan kawat listrik',
          ],
          after: [
            'Hindari air banjir; mungkin telah terkontaminasi',
            'Waspadai area di mana air telah surut karena jalan mungkin rapuh',
            'Bersihkan dan disinfeksi semua yang terkena air',
            'Waspadai ular atau hewan yang mungkin masuk ke rumah',
          ],
          resources: [
            { name: 'InaRisk BNPB', url: 'https://inarisk.bnpb.go.id/' },
          ],
        },
        {
          disaster: 'Kebakaran Rumah',
          icon: '🔥',
          severity: 'medium',
          before: [
            'Pasang alarm asap pada seluruh tingkat/ruang di rumah Anda',
            'Simpan alat pemadam api di dapur dan garasi',
            'Rencanakan dan latih rute pelarian dari tiap ruangan',
            'Jauhkan benda yang mudah terbakar dari sumber panas',
          ],
          during: [
            'Keluar rumah dengan cepat dan tetap di luar; jangan pernah balik ke dalam',
            'Jika asap tebal, merangkak/menunduk saat bergerak',
            'Jika pakaian terbakar: BERHENTI, JATUHKAN DIRI, lalu BERGULING',
            'Hubungi pemadam kebakaran dari area yang aman',
          ],
          after: [
            'Biarkan petugas pemadam memastikan rumah telah aman',
            'Tunggu instruksi sebelum diizinkan masuk kembali',
            'Foto kerusakan bangunan maupun isi rumah untuk asuransi',
            'Hubungi pihak perwakilan asuransi rumah Anda',
          ],
          resources: [
            { name: 'Portal Layanan Pemadam', url: 'https://www.damkar.id/' },
          ],
        },
      ],
    },
  };

  const l = t[language];

  const emergencyContacts = [
    { name: 'Panggilan Darurat', number: '112', description: 'Layanan darurat terpadu (Bebas Pulsa)' },
    { name: 'BPBD Banjarnegara', number: '0812-2648-2247', description: 'Pusdalops Penanggulangan Bencana' },
    { name: 'Polres Banjarnegara', number: '(0286) 591110', description: 'Bantuan kepolisian dan lalu lintas' },
    { name: 'Damkar Banjarnegara', number: '(0286) 592113', description: 'Darurat kebakaran dan penyelamatan' },
    { name: 'RSUD Hj. Anna Lasmanah', number: '(0286) 591464', description: 'Layanan IGD dan medis 24 jam' },
    { name: 'PMI Banjarnegara', number: '(0286) 591245', description: 'Layanan ambulans dan donor darah' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'severity-high';
      case 'medium':
        return 'severity-medium';
      default:
        return 'severity-low';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{l.title}</h2>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>
      </div>

      {/* Emergency Contacts */}
      <Card className="glass border-border/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold text-foreground">{l.emergencyContacts}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {emergencyContacts.map((contact) => (
            <div key={contact.number} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Phone className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{contact.name}</div>
                <div className="text-xl font-bold text-primary">{contact.number}</div>
                <div className="text-xs text-muted-foreground">{contact.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Disaster-specific guidelines */}
      {l.guidelines.map((guideline) => (
        <Card key={guideline.disaster} className={`glass border-border/20 p-6 ${getSeverityColor(guideline.severity)}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{guideline.icon}</span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{l.safetyGuideTitle} {guideline.disaster}</h3>
                <Badge className={getSeverityColor(guideline.severity)}>
                  {l.riskLevel} {guideline.severity === 'high' ? l.high : l.medium}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Before */}
            <div>
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {l.before}
              </h4>
              <ul className="space-y-1 ml-6">
                {guideline.before.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* During */}
            <div>
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {l.during}
              </h4>
              <ul className="space-y-1 ml-6">
                {guideline.during.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div>
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {l.after}
              </h4>
              <ul className="space-y-1 ml-6">
                {guideline.after.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-border/20">
              <h4 className="font-medium text-foreground mb-2">{l.officialResources}</h4>
              <div className="flex flex-wrap gap-2">
                {guideline.resources.map((resource, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="h-3 w-3" />
                      {resource.name}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}

      <Card className="glass border-border/20 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{l.additionalResources}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="outline" asChild>
            <a href="https://www.bnpb.go.id/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {l.bnpb}
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://bpbd.banjarnegarakab.go.id/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {l.bpbd}
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.bmkg.go.id/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {l.bmkg}
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://vsi.esdm.go.id/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {l.pvmbg}
            </a>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DisasterGuidelines;