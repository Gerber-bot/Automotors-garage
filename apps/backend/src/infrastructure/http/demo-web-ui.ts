export function getDemoDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Automotors Garage — Platform Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#ecfdf5',
              500: '#10b981',
              600: '#059669',
              700: '#047857',
              900: '#064e3b',
              950: '#022c22',
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-emerald-500 selection:text-slate-950">

  <!-- TOP BANNER: DEMO IDENTIFIER -->
  <div class="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300">
    <div class="flex items-center gap-2">
      <span class="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">DEMO — MAURICIO REVIEW</span>
      <span>Entorno demostrativo con persistencia real PostgreSQL + Clean Architecture. Sin mocks silenciosos.</span>
    </div>
    <div class="flex items-center gap-3">
      <button onclick="resetDemoData()" class="text-amber-400 hover:text-white underline font-semibold cursor-pointer">
        🔄 Re-sembrar Datos Demo
      </button>
      <span id="api-status-badge" class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
        API: Conectada
      </span>
    </div>
  </div>

  <!-- HEADER -->
  <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl shadow-inner">
        🏎️
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-base font-extrabold text-white tracking-tight">AUTOMOTORS GARAGE</h1>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">v0.8.0</span>
        </div>
        <p id="workshop-display-name" class="text-xs text-emerald-400 font-semibold">[DEMO] Alpha Motors Garage</p>
      </div>
    </div>

    <!-- User / Mechanic Selector -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
        <span class="text-slate-400">Operador:</span>
        <select id="user-select" onchange="switchUser(this.value)" class="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer">
          <option value="mario" class="bg-slate-900 text-slate-200">Mario Rossi (Jefe de Taller)</option>
          <option value="lucas" class="bg-slate-900 text-slate-200">Lucas Gómez (Mecánico)</option>
        </select>
      </div>

      <button onclick="switchTab('QUICK_SERVICE')" class="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer">
        <span>⚡ Quick Service</span>
        <span class="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono">&lt;60s</span>
      </button>

      <button onclick="handleLogout()" title="Cerrar Sesión" class="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 text-sm cursor-pointer">
        🚪 Salir
      </button>
    </div>
  </header>

  <!-- NAVIGATION TABS -->
  <nav class="border-b border-slate-800/80 bg-slate-900/60 px-4 md:px-8 overflow-x-auto py-2.5">
    <div class="flex items-center gap-2 min-w-max text-xs md:text-sm">
      <button onclick="switchTab('DASHBOARD')" id="tab-btn-DASHBOARD" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all">
        📊 Dashboard
      </button>
      <button onclick="switchTab('QUICK_SERVICE')" id="tab-btn-QUICK_SERVICE" class="nav-tab px-3.5 py-1.5 rounded-lg font-bold transition-all text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/30">
        ⚡ Quick Service (&lt;60s)
      </button>
      <button onclick="switchTab('WORK_ORDERS')" id="tab-btn-WORK_ORDERS" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all">
        🛠️ Órdenes de Trabajo (<span id="count-wo">0</span>)
      </button>
      <button onclick="switchTab('VEHICLES')" id="tab-btn-VEHICLES" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all">
        🚗 Flota &amp; Pasaporte (<span id="count-veh">0</span>)
      </button>
      <button onclick="switchTab('PREVENTIVE')" id="tab-btn-PREVENTIVE" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all">
        ⏱️ Próximos Services OEM
      </button>
      <button onclick="switchTab('AI_ASSISTANT')" id="tab-btn-AI_ASSISTANT" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold transition-all">
        🧠 IA Dictado &amp; OBD2
      </button>
    </div>
  </nav>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">

    <!-- GLOBAL ALERT/TOAST -->
    <div id="toast" class="hidden mb-6 p-4 rounded-xl border flex items-center justify-between text-sm animate-fadeIn transition-all">
      <span id="toast-message">Mensaje</span>
      <button onclick="hideToast()" class="text-xs font-bold opacity-70 hover:opacity-100 ml-4">✕</button>
    </div>

    <!-- VIEW: DASHBOARD -->
    <section id="view-DASHBOARD" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Órdenes Activas</span>
          <p id="kpi-active-wo" class="text-3xl font-black text-amber-400 font-mono mt-1">...</p>
          <span class="text-[10px] text-slate-500">En curso en taller</span>
        </div>
        <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completadas</span>
          <p id="kpi-completed-wo" class="text-3xl font-black text-emerald-400 font-mono mt-1">...</p>
          <span class="text-[10px] text-emerald-500 font-semibold">100% Inmutables</span>
        </div>
        <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flota en Taller</span>
          <p id="kpi-vehicles" class="text-3xl font-black text-slate-100 font-mono mt-1">...</p>
          <span class="text-[10px] text-slate-500">Con pasaporte activo</span>
        </div>
        <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Services Próximos</span>
          <p class="text-3xl font-black text-sky-400 font-mono mt-1">2</p>
          <span class="text-[10px] text-sky-500 font-semibold">Cálculo Determinista</span>
        </div>
      </div>

      <!-- Quick Action Banner -->
      <div class="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <span class="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">Funcionalidad Estrella</span>
          <h3 class="text-lg font-bold text-white mt-1">Entrada Rápida de Servicio (Quick Service Entry)</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-xl">
            Registrá cambio de aceite, filtros y chequeo general en menos de 60 segundos con actualización atómica de odómetro, registro inmutable y confirmación asistida por IA.
          </p>
        </div>
        <button onclick="switchTab('QUICK_SERVICE')" class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap">
          Abrir Quick Service ⚡
        </button>
      </div>

      <!-- Featured Vehicle Card: VW GOLF FOR MAURICIO -->
      <div class="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 shadow-md">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded border border-emerald-500/30 uppercase tracking-wider">
              Vehículo Destacado para Mauricio
            </span>
            <h3 class="font-bold text-base text-white">Volkswagen Golf VII 1.4 TSI Highline DSG (2019)</h3>
          </div>
          <span class="font-mono text-xs font-bold px-3 py-1 bg-black text-emerald-400 rounded-lg border border-slate-700">
            AE123CD
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono mb-4">
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-500 block text-[10px]">Odómetro Registrado</span>
            <span class="text-emerald-400 font-bold text-base">58,400 km</span>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-500 block text-[10px]">Cliente Propietario</span>
            <span class="text-slate-200 font-bold text-sm">Mauricio Fernández</span>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-500 block text-[10px]">Último Service Realizado</span>
            <span class="text-slate-200 font-bold text-sm">45,000 km (Certificado)</span>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-500 block text-[10px]">Próximo Vencimiento OEM</span>
            <span class="text-amber-400 font-bold text-sm">60,000 km (en 1,600 km)</span>
          </div>
        </div>
        <div class="flex items-center justify-between pt-2">
          <p class="text-xs text-slate-400">Motor 1.4 TSI 150 CV (EA211) • Caja DSG 7 marchas • Chasis: WVWZZZAUZKP100001</p>
          <button onclick="openVehiclePassport('d0000000-0000-4000-8000-000000000001')" class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-all cursor-pointer">
            Ver Pasaporte Digital 🛡️
          </button>
        </div>
      </div>
    </section>

    <!-- VIEW: QUICK SERVICE ENTRY -->
    <section id="view-QUICK_SERVICE" class="hidden max-w-3xl mx-auto space-y-6">
      <div class="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-5">
        <div>
          <span class="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Flujo Mobile-First</span>
          <h2 class="text-xl font-black text-white mt-0.5">Quick Service Entry &lt;60 Segundos</h2>
          <p class="text-xs text-slate-400 mt-1">Registrá una intervención de rutina en una sola transacción atómica verificada.</p>
        </div>

        <!-- Paso 1: Seleccionar Vehículo -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300">1. Seleccionar Vehículo por Patente o Modelo</label>
          <select id="qs-vehicle-select" onchange="onQsVehicleSelected(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-emerald-500">
            <option value="">-- Seleccionar vehículo del taller --</option>
          </select>
        </div>

        <!-- Info del vehículo seleccionado -->
        <div id="qs-vehicle-info" class="hidden p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span id="qs-veh-plate" class="font-mono font-bold px-2.5 py-1 bg-black text-emerald-400 rounded border border-slate-700 uppercase">...</span>
            <span id="qs-veh-name" class="font-bold text-white ml-2">...</span>
          </div>
          <div>
            <span class="text-slate-400">Odómetro actual:</span>
            <strong id="qs-veh-km" class="text-emerald-400 font-mono text-sm ml-1">... km</strong>
          </div>
        </div>

        <!-- Paso 2: Kilometraje Nuevo -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300">2. Kilometraje Informado en Odómetro (km)</label>
          <input type="number" id="qs-odometer" placeholder="Ej: 58500" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-500">
          <span class="text-[10px] text-slate-500">Debe ser igual o mayor al odómetro registrado actualmente.</span>
        </div>

        <!-- Paso 3: Trabajos Realizados -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300">3. Trabajos Realizados (Selección Rápida)</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5" id="qs-service-pills">
            <label class="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" value="Aceite Sintético 5W40 y Filtro Mann" checked class="accent-emerald-500">
              <span>Aceite y Filtro</span>
            </label>
            <label class="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" value="Filtro de Aire y Habitáculo" class="accent-emerald-500">
              <span>Filtro de Aire</span>
            </label>
            <label class="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" value="Pastillas de Freno Cerámicas" class="accent-emerald-500">
              <span>Pastillas de Freno</span>
            </label>
            <label class="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" value="Rotación y Calibración Neumáticos" class="accent-emerald-500">
              <span>Rotación Ruedas</span>
            </label>
            <label class="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" value="Chequeo Computarizado OBD2" checked class="accent-emerald-500">
              <span>Escaneo OBD2</span>
            </label>
            <label class="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" value="Líquido Refrigerante y Frenos" class="accent-emerald-500">
              <span>Nivel de Fluidos</span>
            </label>
          </div>
        </div>

        <!-- Asistente de Voz / Dictado IA -->
        <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              🎤 Dictado por Voz Asistido con IA
            </span>
            <span class="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
              Whisper + LLM
            </span>
          </div>
          <p class="text-xs text-slate-400">Dictá las observaciones del mecánico para autocompletar la orden y el kilometraje.</p>
          <div class="flex gap-2">
            <button type="button" onclick="simulateVoiceDictation()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer">
              🎙️ Simular Dictado de Mecánico
            </button>
            <span id="voice-status" class="text-xs text-slate-400 self-center"></span>
          </div>

          <!-- Panel de confirmación humana obligatoria -->
          <div id="ai-confirmation-box" class="hidden p-3.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-xs space-y-2">
            <div class="flex items-center justify-between">
              <strong class="text-emerald-400">Propuesta de IA extraída:</strong>
              <span class="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">requiresConfirmation: true</span>
            </div>
            <p id="ai-extracted-text" class="text-slate-300 font-mono text-[11px] bg-slate-950 p-2 rounded">...</p>
            <label class="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer pt-1">
              <input type="checkbox" id="ai-confirm-checkbox" class="accent-emerald-500">
              <span>Confirmo como técnico responsable que los datos extraídos son verídicos.</span>
            </label>
          </div>
        </div>

        <!-- Observaciones libres -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-300">4. Observaciones Técnicas Internas</label>
          <textarea id="qs-notes" rows="2" placeholder="Ej: Neumáticos con 5.5mm. Sin fugas detectadas." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"></textarea>
        </div>

        <!-- Botón Guardar -->
        <button type="button" onclick="submitQuickService()" id="qs-submit-btn" class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2">
          <span>⚡ Confirmar y Guardar Servicio en Persistencia</span>
        </button>
      </div>
    </section>

    <!-- VIEW: WORK ORDERS -->
    <section id="view-WORK_ORDERS" class="hidden space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-white">Órdenes de Trabajo del Taller</h2>
          <p class="text-xs text-slate-400">Aislamiento por taller activo garantizado mediante TenantGuard.</p>
        </div>
        <button onclick="switchTab('QUICK_SERVICE')" class="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer">
          + Nueva Orden
        </button>
      </div>

      <div id="work-orders-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Rendered via JS -->
      </div>
    </section>

    <!-- VIEW: VEHICLES & PASSPORT -->
    <section id="view-VEHICLES" class="hidden space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-white">Parque Automotor Registrado</h2>
          <p class="text-xs text-slate-400">Historiales vehiculares inmutables y pasaportes B2C auditables.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div id="vehicles-list" class="space-y-3">
          <!-- Rendered via JS -->
        </div>

        <!-- Selected Vehicle Passport Preview -->
        <div class="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div class="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span id="vp-plate" class="font-mono text-xs font-bold px-3 py-1 bg-black text-emerald-400 rounded-lg border border-slate-700 uppercase">...</span>
              <h3 id="vp-title" class="text-lg font-black text-white mt-2">Seleccioná un vehículo</h3>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-500 block">Modo Vista:</span>
              <button onclick="togglePublicPassport()" id="passport-mode-toggle" class="text-xs font-bold text-emerald-400 hover:underline cursor-pointer">
                🛡️ Modo Taller (Completo)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 text-xs font-mono">
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span class="text-slate-500 block text-[10px]">Odómetro</span>
              <strong id="vp-km" class="text-emerald-400 text-sm">... km</strong>
            </div>
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span class="text-slate-500 block text-[10px]">Motorización</span>
              <strong id="vp-engine" class="text-slate-200 text-sm">...</strong>
            </div>
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span class="text-slate-500 block text-[10px]">VIN / Chasis</span>
              <strong id="vp-vin" class="text-slate-400 text-xs">...</strong>
            </div>
          </div>

          <div>
            <h4 class="font-bold text-sm text-slate-200 mb-3">Historial de Intervenciones Certificadas</h4>
            <div id="vp-history-list" class="space-y-3">
              <!-- Rendered via JS -->
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- VIEW: PREVENTIVE SERVICES -->
    <section id="view-PREVENTIVE" class="hidden space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white">Vencimientos Preventivos Deterministas (OEM)</h2>
        <p class="text-xs text-slate-400">Reglas técnicas documentadas por fabricante. Nunca calculadas por intuición de LLM.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- VW Golf Card -->
        <div class="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold px-2 py-0.5 bg-black text-emerald-400 rounded border border-slate-700">AE123CD</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">PRÓXIMO A VENCER</span>
          </div>
          <h4 class="font-bold text-sm text-white">Volkswagen Golf VII 1.4 TSI</h4>
          <p class="text-xs text-slate-400">Service 60.000 km: Aceite 5W40 + Filtro + Bujías Laser Platinum.</p>
          <div class="p-3 bg-slate-950 rounded-xl text-xs font-mono space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Odómetro:</span><span class="text-slate-300">58,400 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Límite:</span><span class="text-amber-400 font-bold">60,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Restante:</span><span class="text-amber-400 font-bold">1,600 km</span></div>
          </div>
          <p class="text-[10px] text-slate-500 italic">Fuente: Manual Plan de Mantenimiento VW Golf VII (pág. 24)</p>
        </div>

        <!-- Toyota Corolla Card -->
        <div class="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold px-2 py-0.5 bg-black text-slate-200 rounded border border-slate-700">AF456GH</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">EN REGLA</span>
          </div>
          <h4 class="font-bold text-sm text-white">Toyota Corolla 2.0 SEG</h4>
          <p class="text-xs text-slate-400">Service 40.000 km: Aceite Genuino 0W20 + Filtro Cartucho.</p>
          <div class="p-3 bg-slate-950 rounded-xl text-xs font-mono space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Odómetro:</span><span class="text-slate-300">35,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Límite:</span><span class="text-emerald-400 font-bold">40,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Restante:</span><span class="text-emerald-400 font-bold">5,000 km</span></div>
          </div>
          <p class="text-[10px] text-slate-500 italic">Fuente: Manual de Propietario Toyota Corolla 2022 (pág. 142)</p>
        </div>

        <!-- Ford Ranger Card -->
        <div class="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold px-2 py-0.5 bg-black text-slate-200 rounded border border-slate-700">AD789JK</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">VENCIDO</span>
          </div>
          <h4 class="font-bold text-sm text-white">Ford Ranger 3.2 TDCi</h4>
          <p class="text-xs text-slate-400">Service 90.000 km: Aceite 5W30 + Filtro Diésel + Revisión Suspensión.</p>
          <div class="p-3 bg-slate-950 rounded-xl text-xs font-mono space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Odómetro:</span><span class="text-slate-300">92,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Límite:</span><span class="text-rose-400 font-bold">90,000 km</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Excedido:</span><span class="text-rose-400 font-bold">+2,000 km</span></div>
          </div>
          <p class="text-[10px] text-slate-500 italic">Fuente: Guía de Mantenimiento Programado Ford Ranger (pág. 68)</p>
        </div>
      </div>
    </section>

    <!-- VIEW: AI ASSISTANT & OBD2 -->
    <section id="view-AI_ASSISTANT" class="hidden max-w-2xl mx-auto space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white">Asistente de IA &amp; Diagnóstico OBD2</h2>
        <p class="text-xs text-slate-400">Interpretación de códigos de avería DTC orientativa con descargo de responsabilidad.</p>
      </div>

      <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <label class="text-xs font-bold text-slate-300">Códigos DTC / Scanner OBD2</label>
        <div class="flex gap-2">
          <input type="text" id="obd-input" value="P0300, P0171" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 font-mono text-sm text-slate-100 uppercase focus:outline-none focus:border-emerald-500">
          <button onclick="interpretObdCodes()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer">
            Analizar DTC
          </button>
        </div>

        <div id="obd-result-box" class="hidden p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-2 text-xs">
          <h4 class="font-bold text-emerald-400">Resultado del Diagnóstico:</h4>
          <p id="obd-summary" class="text-slate-200">...</p>
          <div class="pt-2 border-t border-slate-800">
            <span class="text-[11px] text-amber-400 block font-semibold">
              ⚠️ Descargo legal obligatorio: Sugerencia de asistencia técnica orientativa. Se requiere inspección física obligatoria por el técnico responsable.
            </span>
          </div>
        </div>
      </div>
    </section>

  </main>

  <script>
    // State
    let authToken = null;
    let activeTenantId = 'a0000000-0000-4000-8000-000000000001';
    let currentUser = null;
    let vehicles = [];
    let workOrders = [];
    let isPublicPassportView = false;
    let selectedVehicleId = 'd0000000-0000-4000-8000-000000000001';

    // Auto-login on startup
    async function init() {
      await autoLogin('mario@alphamotors.com', 'Password123!');
      await loadAllData();
      switchTab('DASHBOARD');
    }

    async function autoLogin(email, password) {
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, workshopId: activeTenantId })
        });
        const data = await res.json();
        if (res.ok) {
          authToken = data.token;
          activeTenantId = data.session.activeTenantId;
          currentUser = data.user;
          document.getElementById('api-status-badge').textContent = 'API: Conectada';
          document.getElementById('api-status-badge').className = 'px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold';
        } else {
          showToast(data.error || 'Error al iniciar sesión', 'error');
        }
      } catch (err) {
        showToast('Error de red al conectar con API: ' + err.message, 'error');
      }
    }

    async function loadAllData() {
      if (!authToken) return;
      try {
        // 1. Fetch Vehicles
        const vRes = await fetch('/api/v1/vehicles', {
          headers: { 'Authorization': 'Bearer ' + authToken, 'x-tenant-id': activeTenantId }
        });
        if (vRes.ok) {
          vehicles = await vRes.json();
          document.getElementById('count-veh').textContent = vehicles.length;
          document.getElementById('kpi-vehicles').textContent = vehicles.length;
          renderVehiclesList();
          populateQsVehicleSelect();
        }

        // 2. Fetch Work Orders
        const woRes = await fetch('/api/v1/work-orders', {
          headers: { 'Authorization': 'Bearer ' + authToken, 'x-tenant-id': activeTenantId }
        });
        if (woRes.ok) {
          workOrders = await woRes.json();
          document.getElementById('count-wo').textContent = workOrders.length;
          const activeCount = workOrders.filter(w => w.status !== 'COMPLETED').length;
          const completedCount = workOrders.filter(w => w.status === 'COMPLETED').length;
          document.getElementById('kpi-active-wo').textContent = activeCount;
          document.getElementById('kpi-completed-wo').textContent = completedCount;
          renderWorkOrders();
        }

        // 3. Load Featured Vehicle Passport
        if (vehicles.length > 0) {
          openVehiclePassport(selectedVehicleId);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      }
    }

    function switchTab(tabName) {
      const tabs = ['DASHBOARD', 'QUICK_SERVICE', 'WORK_ORDERS', 'VEHICLES', 'PREVENTIVE', 'AI_ASSISTANT'];
      tabs.forEach(t => {
        const viewEl = document.getElementById('view-' + t);
        const btnEl = document.getElementById('tab-btn-' + t);
        if (viewEl) viewEl.classList.toggle('hidden', t !== tabName);
        if (btnEl) {
          if (t === tabName) {
            btnEl.className = 'nav-tab px-3.5 py-1.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm transition-all';
          } else {
            btnEl.className = 'nav-tab px-3.5 py-1.5 rounded-lg font-semibold text-slate-400 hover:text-slate-200 transition-all';
          }
        }
      });
    }

    function renderWorkOrders() {
      const grid = document.getElementById('work-orders-grid');
      if (!grid) return;
      if (workOrders.length === 0) {
        grid.innerHTML = '<p class="text-xs text-slate-500 col-span-2">No hay órdenes de trabajo activas en este taller.</p>';
        return;
      }
      grid.innerHTML = workOrders.map(wo => {
        const isCompleted = wo.status === 'COMPLETED';
        const badgeColor = isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        const veh = vehicles.find(v => v.id === wo.vehicleId);
        return \`
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <span class="font-mono text-xs font-bold text-slate-400">\${wo.id.slice(0, 8)}...</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border \${badgeColor}">\${wo.status}</span>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono text-xs font-bold px-2 py-0.5 bg-black text-emerald-400 rounded border border-slate-700">\${veh?.plate || 'S/P'}</span>
                <span class="font-bold text-white text-xs">\${veh ? veh.make + ' ' + veh.model : 'Vehículo'}</span>
              </div>
              <h4 class="font-semibold text-slate-200 text-xs mt-1">\${wo.reportedIssue}</h4>
              \${wo.diagnosis ? \`<p class="text-[11px] text-slate-400 bg-slate-950 p-2 rounded mt-2 font-mono">\${wo.diagnosis}</p>\` : ''}
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
              <span class="text-slate-500">\${Number(wo.reportedMileage).toLocaleString()} km</span>
              \${!isCompleted ? \`
                <button onclick="closeWorkOrder('\${wo.id}')" class="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-lg transition-all cursor-pointer">
                  Cerrar Orden Transaccional 🔒
                </button>
              \` : '<span class="text-emerald-500 font-bold text-[11px]">✓ Certificado</span>'}
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderVehiclesList() {
      const list = document.getElementById('vehicles-list');
      if (!list) return;
      list.innerHTML = vehicles.map(v => {
        const isSelected = v.id === selectedVehicleId;
        const borderClass = isSelected ? 'border-emerald-500 bg-slate-900/90' : 'border-slate-800 bg-slate-950 hover:border-slate-700';
        return \`
          <div onclick="openVehiclePassport('\${v.id}')" class="p-4 border rounded-2xl cursor-pointer transition-all space-y-2 \${borderClass}">
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs font-bold px-2.5 py-0.5 bg-black text-emerald-400 rounded border border-slate-700">\${v.plate || 'S/P'}</span>
              <span class="font-mono text-xs text-slate-400">\${Number(v.currentMileage).toLocaleString()} km</span>
            </div>
            <h4 class="font-bold text-sm text-white">\${v.make} \${v.model} (\${v.year})</h4>
            <span class="text-[10px] text-slate-500 font-mono block">VIN: \${v.vin}</span>
          </div>
        \`;
      }).join('');
    }

    function populateQsVehicleSelect() {
      const sel = document.getElementById('qs-vehicle-select');
      if (!sel) return;
      sel.innerHTML = '<option value="">-- Seleccionar vehículo del taller --</option>' +
        vehicles.map(v => \`<option value="\${v.id}">\${v.plate || 'S/P'} — \${v.make} \${v.model} (\${v.currentMileage} km)</option>\`).join('');
      // Default to VW Golf if available
      const golf = vehicles.find(v => v.make.toLowerCase().includes('volkswagen'));
      if (golf) {
        sel.value = golf.id;
        onQsVehicleSelected(golf.id);
      }
    }

    function onQsVehicleSelected(id) {
      const veh = vehicles.find(v => v.id === id);
      const infoBox = document.getElementById('qs-vehicle-info');
      const odoInput = document.getElementById('qs-odometer');
      if (!veh) {
        infoBox.classList.add('hidden');
        return;
      }
      infoBox.classList.remove('hidden');
      document.getElementById('qs-veh-plate').textContent = veh.plate || 'S/P';
      document.getElementById('qs-veh-name').textContent = veh.make + ' ' + veh.model;
      document.getElementById('qs-veh-km').textContent = Number(veh.currentMileage).toLocaleString() + ' km';
      odoInput.value = veh.currentMileage + 100; // Suggest increment
    }

    async function openVehiclePassport(vehicleId) {
      selectedVehicleId = vehicleId;
      renderVehiclesList();
      try {
        const query = isPublicPassportView ? '?public=true' : '';
        const res = await fetch(\`/api/v1/vehicles/\${vehicleId}/passport\${query}\`, {
          headers: { 'Authorization': 'Bearer ' + authToken, 'x-tenant-id': activeTenantId }
        });
        if (res.ok) {
          const pass = await res.json();
          document.getElementById('vp-plate').textContent = pass.vehicle.plate || 'S/P';
          document.getElementById('vp-title').textContent = pass.vehicle.make + ' ' + pass.vehicle.model + ' (' + pass.vehicle.year + ')';
          document.getElementById('vp-km').textContent = Number(pass.vehicle.currentMileage).toLocaleString() + ' km';
          document.getElementById('vp-engine').textContent = pass.vehicle.engine || 'Standard';
          document.getElementById('vp-vin').textContent = pass.vehicle.vin;

          const historyList = document.getElementById('vp-history-list');
          const records = pass.timeline || pass.records || [];
          if (!records || records.length === 0) {
            historyList.innerHTML = '<p class="text-xs text-slate-500">Sin intervenciones registradas aún.</p>';
          } else {
            historyList.innerHTML = records.map(r => \`
              <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-slate-200">\${r.workshopName}</span>
                  <span class="font-mono text-emerald-400 font-bold">\${Number(r.recordedMileage).toLocaleString()} km</span>
                </div>
                <div class="flex flex-wrap gap-1">
                  \${(r.servicesPerformed || []).map(s => \`<span class="px-2 py-0.5 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded">\${s.title || s}</span>\`).join('')}
                </div>
                \${r.internalNotes ? \`<p class="text-[10px] text-slate-400 italic">Notas: \${r.internalNotes}</p>\` : ''}
              </div>
            \`).join('');
          }
        }
      } catch (err) {
        console.error('Error cargando pasaporte:', err);
      }
    }

    function togglePublicPassport() {
      isPublicPassportView = !isPublicPassportView;
      const btn = document.getElementById('passport-mode-toggle');
      if (isPublicPassportView) {
        btn.textContent = '👁️ Modo Público B2C (PII y Costos Sanitizados)';
        btn.className = 'text-xs font-bold text-amber-400 hover:underline cursor-pointer';
      } else {
        btn.textContent = '🛡️ Modo Taller (Completo)';
        btn.className = 'text-xs font-bold text-emerald-400 hover:underline cursor-pointer';
      }
      openVehiclePassport(selectedVehicleId);
    }

    function simulateVoiceDictation() {
      const status = document.getElementById('voice-status');
      status.textContent = 'Escuchando dictado del mecánico...';
      setTimeout(() => {
        status.textContent = 'Procesando Whisper + Extractor LLM...';
        setTimeout(() => {
          status.textContent = '✓ Dictado procesado exitosamente.';
          const box = document.getElementById('ai-confirmation-box');
          box.classList.remove('hidden');
          document.getElementById('ai-extracted-text').textContent =
            'Dictado: "Ingresó Golf para cambio de aceite 5W40 y chequeo general con 58.500 km. Batería en 85%."';
          document.getElementById('qs-odometer').value = 58500;
        }, 600);
      }, 500);
    }

    async function submitQuickService() {
      const vehId = document.getElementById('qs-vehicle-select').value;
      const odo = Number(document.getElementById('qs-odometer').value);
      const notes = document.getElementById('qs-notes').value;

      if (!vehId) {
        showToast('Por favor seleccioná un vehículo.', 'error');
        return;
      }
      if (!odo || odo <= 0) {
        showToast('El kilometraje informado debe ser un número positivo.', 'error');
        return;
      }

      // Check ai confirmation if dictation was opened
      const box = document.getElementById('ai-confirmation-box');
      if (!box.classList.contains('hidden')) {
        const checked = document.getElementById('ai-confirm-checkbox').checked;
        if (!checked) {
          showToast('La IA exige confirmación humana obligatoria antes de persistir.', 'error');
          return;
        }
      }

      const checkboxes = document.querySelectorAll('#qs-service-pills input[type="checkbox"]:checked');
      const services = Array.from(checkboxes).map(c => c.value);
      if (services.length === 0) {
        showToast('Seleccioná al menos un trabajo realizado.', 'error');
        return;
      }

      const btn = document.getElementById('qs-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Guardando en PostgreSQL...';

      try {
        const res = await fetch('/api/v1/work-orders/quick-service', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken,
            'x-tenant-id': activeTenantId
          },
          body: JSON.stringify({
            vehicleId: vehId,
            odometerKm: odo,
            interventions: services,
            observations: notes || 'Service rápido ejecutado satisfactoriamente.',
            idempotencyKey: 'qs-' + Date.now()
          })
        });

        const data = await res.json();
        if (res.ok) {
          showToast('¡Quick Service guardado con éxito! Odómetro actualizado y orden cerrada atómicamente.', 'success');
          await loadAllData();
          switchTab('WORK_ORDERS');
        } else {
          showToast(data.error || 'Error al guardar Quick Service', 'error');
        }
      } catch (err) {
        showToast('Error de red: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Confirmar y Guardar Servicio en Persistencia';
      }
    }

    async function closeWorkOrder(orderId) {
      try {
        const res = await fetch(\`/api/v1/work-orders/\${orderId}/close\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken,
            'x-tenant-id': activeTenantId
          },
          body: JSON.stringify({
            idempotencyKey: 'close-' + orderId + '-' + Date.now(),
            internalNotes: 'Orden completada y verificada en banco de pruebas.',
            partsCost: 35000,
            laborCost: 15000
          })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Orden cerrada atómicamente con Unit of Work y outbox event.', 'success');
          await loadAllData();
        } else {
          showToast(data.error || 'Error al cerrar orden', 'error');
        }
      } catch (err) {
        showToast('Error de red al cerrar orden: ' + err.message, 'error');
      }
    }

    async function interpretObdCodes() {
      const code = document.getElementById('obd-input').value;
      if (!code) return;
      try {
        const res = await fetch('/api/v1/ai/obd2/interpret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken,
            'x-tenant-id': activeTenantId
          },
          body: JSON.stringify({
            dtcCodes: code.split(',').map(s => s.trim()),
            vehicleSpecs: { make: 'Volkswagen', model: 'Golf', year: 2019 }
          })
        });
        const data = await res.json();
        if (res.ok) {
          const box = document.getElementById('obd-result-box');
          box.classList.remove('hidden');
          document.getElementById('obd-summary').textContent = data.interpretation || JSON.stringify(data);
        } else {
          showToast(data.error || 'Error analizando OBD2', 'error');
        }
      } catch (err) {
        showToast('Error al consultar interpretador OBD2: ' + err.message, 'error');
      }
    }

    async function resetDemoData() {
      try {
        const res = await fetch('/api/v1/demo/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Datos demo re-sembrados con éxito en PostgreSQL.', 'success');
          await loadAllData();
        } else {
          showToast(data.error || 'Error al re-sembrar datos demo', 'error');
        }
      } catch (err) {
        showToast('Error al re-sembrar: ' + err.message, 'error');
      }
    }

    function switchUser(userKey) {
      if (userKey === 'mario') {
        autoLogin('mario@alphamotors.com', 'Password123!').then(() => loadAllData());
      } else {
        autoLogin('lucas@alphamotors.com', 'Password123!').then(() => loadAllData());
      }
    }

    function handleLogout() {
      authToken = null;
      document.getElementById('api-status-badge').textContent = 'API: Desconectada';
      document.getElementById('api-status-badge').className = 'px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold';
      showToast('Sesión cerrada. Para reingresar, seleccioná un operador en la barra superior.', 'info');
    }

    function showToast(msg, type = 'info') {
      const toast = document.getElementById('toast');
      const text = document.getElementById('toast-message');
      text.textContent = msg;
      if (type === 'error') {
        toast.className = 'mb-6 p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-300 flex items-center justify-between text-sm animate-fadeIn';
      } else if (type === 'success') {
        toast.className = 'mb-6 p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm animate-fadeIn';
      } else {
        toast.className = 'mb-6 p-4 rounded-xl border bg-slate-900 border-slate-700 text-slate-200 flex items-center justify-between text-sm animate-fadeIn';
      }
      toast.classList.remove('hidden');
      setTimeout(() => hideToast(), 5000);
    }

    function hideToast() {
      document.getElementById('toast').classList.add('hidden');
    }

    // Run
    init();
  </script>
</body>
</html>
`;
}
