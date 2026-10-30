# Developer Guide: Contributing to the Vehicle Catalog

## 1. Principles of Contribution

The Automotors Garage Vehicle Knowledge Base is the technical foundation powering predictive maintenance schedules for vehicle owners and repair shops. To protect vehicle integrity and user safety, **every entry must adhere to the following non-negotiable standards**:

1. **Documentary Proof Required**: Every powertrain, fluid capacity, and service interval must cite an official manufacturer source (`kb_document_sources`), such as an official Owner's Manual, Factory Workshop Manual (Manual de Taller), or Technical Service Bulletin (Circular Técnica).
2. **Zero Generative AI Hallucinations**: Generative AI must never generate or estimate intervals, viscosities, or torque values without documentary backing.
3. **Immutability of Historical Audits**: Never update an existing verified rule in-place. If an interval is corrected or amended by the manufacturer, submit a versioned revision.

---

## 2. Contribution Workflow

### Step 1: Register Document Source
Before adding configurations or maintenance rules, ensure the documentary source is registered in `kb_document_sources`:

```typescript
const [source] = await db.insert(kbDocumentSources).values({
  title: 'Manual de Taller y Plan de Mantenimiento Oficial Renault Logan II',
  publisher: 'Renault Argentina S.A.',
  publicationYear: 2020,
  documentCode: 'MR-LOGAN-2020-AR',
  documentType: 'MANUAL_TALLER',
  referenceLink: 'https://docs.automotorsgarage.internal/sources/renault/logan-2020.pdf',
}).returning();
```

### Step 2: Register Powertrain Specifications
Register the exact powertrain code and mechanical distribution architecture:

```typescript
const [powertrain] = await db.insert(kbPowertrains).values({
  manufacturerId: renault.id,
  engineCode: 'H4M',
  commercialName: '1.6 16v SCe',
  family: 'Nissan HR / Renault SCe',
  displacementCc: 1598,
  displacementLiters: '1.6',
  fuelType: 'Nafta',
  valves: 16,
  powerHp: 115,
  timingMechanism: 'CADENA', // 'CADENA' | 'CORREA'
  timingObservations: 'Cadena de distribución metálica interna libre de mantenimiento programado. Reemplazo de correa de accesorios cada 60.000 km o 4 años.',
  oilViscosityOem: '5W-30 / 5W-40 RN 0710',
  oilCapacityLiters: '4.0',
  verificationStatus: 'VERIFIED',
}).returning();
```

### Step 3: Register Configuration
Bind model, generation, and powertrain into a configuration:

```typescript
const [config] = await db.insert(kbConfigurations).values({
  modelId: loganModel.id,
  generationId: loganGen2.id,
  powertrainId: powertrain.id,
  commercialName: 'Renault Logan II Zen/Intens 1.6 16v SCe',
  yearFrom: 2019,
  yearTo: 2024,
  market: 'Mercosur',
  transmission: 'Manual 5 velocidades',
  bodyStyle: 'Sedán',
  trim: 'Zen / Intens',
  sourceId: source.id,
  verificationStatus: 'VERIFIED',
}).returning();
```

### Step 4: Register Verified Technical Specs
```typescript
await db.insert(kbTechnicalSpecs).values([
  {
    configurationId: config.id,
    category: 'ENGINE_OIL',
    specKey: 'oem_viscosity',
    specValue: '5W-30 / 5W-40',
    unit: 'SAE',
    sourceId: source.id,
    verificationStatus: 'VERIFIED',
  },
  {
    configurationId: config.id,
    category: 'BRAKES',
    specKey: 'fluid_standard',
    specValue: 'DOT 4 / ISO 4925 Class 4',
    sourceId: source.id,
    verificationStatus: 'VERIFIED',
  },
]);
```

### Step 5: Register Maintenance Rules
```typescript
await db.insert(kbMaintenanceRules).values([
  {
    configurationId: config.id,
    category: 'OIL_AND_FILTER',
    operation: 'REPLACE',
    title: 'Cambio de Aceite de Motor y Filtro',
    description: 'Reemplazo de aceite sintético 5W-40 y filtro de aceite original con arandela de tapón de cárter.',
    intervalKm: 10000,
    intervalMonths: 12,
    severeIntervalKm: 5000,
    severeIntervalMonths: 6,
    conditions: 'Uso severo: trayectos urbanos cortos menores a 5 km, ralentí prolongado o uso como taxi/remís.',
    sourceId: source.id,
    verificationStatus: 'VERIFIED',
    ruleVersion: 1,
    isActive: true,
  },
]);
```

---

## 3. Modifying an Existing Rule (Audit Trail Protocol)

When a manufacturer issues a technical service bulletin modifying an interval:
1. Do **NOT** execute an `UPDATE kb_maintenance_rules SET interval_km = ...`.
2. Use the audited revision API endpoint `POST /api/v1/kb/rules/:id/revision` or repository method `createRuleRevision(...)`.
3. The platform will:
   - Mark the existing rule as `is_active = false` and `verification_status = 'DEPRECATED'`.
   - Insert a new row with `rule_version = old.rule_version + 1` and `previous_version_id = old.id`.
   - Preserve historical maintenance records that were calculated under the prior rule version.
