"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Shield, 
  ShieldCheck, 
  UserPlus, 
  Users, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  Palette, 
  Download, 
  RefreshCw, 
  Key, 
  Building2,
  Eye,
  EyeOff,
  Search,
  LogOut,
  Clock,
  HardHat,
  MapPin,
  FileCheck,
  UserCog,
  Plus,
  Trash2,
  Edit3,
  Check,
  Layers,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FolderPlus,
  Globe,
  ExternalLink,
  BarChart3,
  FileText,
  Printer,
  Activity,
  Copy,
  Radio,
  Filter
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface Usuario {
  id: number;
  username: string;
  email: string | null;
  rut: string | null;
  nombre_completo: string;
  rol: "ADMINISTRADOR" | "ADMINISTRATIVO" | "VISITA" | string;
  grupo_id: number | null;
  grupo_nombre: string | null;
  activo: boolean;
  totp_enabled: boolean;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  ultimo_acceso: string | null;
}

interface PermisoItem {
  modulo: string;
  acceso: "NONE" | "READ" | "WRITE";
}

interface Grupo {
  id: number;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  permisos: PermisoItem[];
  total_usuarios: number;
}

const ALL_MODULES = [
  "INHUMACIONES",
  "UBICACIONES",
  "ARRIENDOS",
  "CERTIFICADOS",
  "CAMPO",
  "AUDITORIA",
  "REPORTES",
  "CONFIGURACION",
  "USUARIOS"
];

const MODULE_INFO: Record<string, { label: string; desc: string; icon: any }> = {
  INHUMACIONES: {
    label: "Inhumaciones & Sepulturas",
    desc: "Libros oficiales de sepultación y registro de fallecidos.",
    icon: Users
  },
  UBICACIONES: {
    label: "Catastro y Mapa GIS",
    desc: "Cuarteles, nichos, sepulturas y georreferenciación.",
    icon: MapPin
  },
  ARRIENDOS: {
    label: "Arriendos & Concesiones",
    desc: "Contratos temporales, renovaciones y aranceles municipales.",
    icon: Clock
  },
  CERTIFICADOS: {
    label: "Certificados Oficiales",
    desc: "Emisión de comprobantes con sello criptográfico SHA-256.",
    icon: FileCheck
  },
  CAMPO: {
    label: "Modo Terreno & Obras",
    desc: "Órdenes de cuadrilla, exhumaciones y traslados en terreno.",
    icon: HardHat
  },
  AUDITORIA: {
    label: "Auditoría Criptográfica",
    desc: "Trazabilidad inmutable según Ley 21.719 y ASVS Nivel 2.",
    icon: ShieldCheck
  },
  REPORTES: {
    label: "Reportes & Estadísticas",
    desc: "Libro de defunciones, vencimientos, capacidad territorial y finanzas.",
    icon: BarChart3
  },
  CONFIGURACION: {
    label: "Configuración & Temas",
    desc: "Identidad visual institucional y parámetros comunales.",
    icon: Palette
  },
  USUARIOS: {
    label: "Gestión de Personal & RBAC",
    desc: "Administración de funcionarios, grupos y políticas de acceso.",
    icon: UserCog
  }
};

export default function AdminPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"usuarios" | "grupos" | "portal" | "reportes" | "actividad">("usuarios");

  // Portal Public Access Configuration State
  const [portalConfig, setPortalConfig] = useState({
    id: 1,
    permitir_lista_fallecidos: false,
    permitir_busqueda_publica: false,
    titulo_portal: "Portal Ciudadano de Certificados Municipales",
    mensaje_portal: "Verificación digital y autenticidad de certificados para los Cementerios de San Carlos y Cachapoal (Ley 21.719).",
    actualizado_por: null as string | null,
    updated_at: null as string | null,
  });
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [savingPortal, setSavingPortal] = useState(false);
  const [portalSuccessMsg, setPortalSuccessMsg] = useState<string | null>(null);

  // Auth State
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("AdminCem2026!");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Users State
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterGroup, setFilterGroup] = useState("ALL");

  // Groups State
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // User Form fields
  const [formNombre, setFormNombre] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRut, setFormRut] = useState("");
  const [formRol, setFormRol] = useState("ADMINISTRATIVO");
  const [formGrupoId, setFormGrupoId] = useState<number | "">("");
  const [formPassword, setFormPassword] = useState("Segura2026!Municipal");

  // Group Create / Edit Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupNombre, setGroupNombre] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupPermisos, setGroupPermisos] = useState<Record<string, "NONE" | "READ" | "WRITE">>({});
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Assign User to Group Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<Usuario | null>(null);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<number | "">("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Edit User Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRut, setEditRut] = useState("");
  const [editRol, setEditRol] = useState("ADMINISTRATIVO");
  const [editGrupoId, setEditGrupoId] = useState<number | "">("");
  const [editActivo, setEditActivo] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Admin Change Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Action status message
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Reports State in Admin Tab
  const [reportCemetery, setReportCemetery] = useState<string>("");
  const [reportFechaDesde, setReportFechaDesde] = useState<string>("");
  const [reportFechaHasta, setReportFechaHasta] = useState<string>("");
  const [resumenKPIs, setResumenKPIs] = useState<any>(null);
  const [loadingKPIs, setLoadingKPIs] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const apiUrl = "";  // always relative — proxied by Next.js rewrites + Nginx

  const fetchResumenKPIs = async (authToken?: string, cemeteryId?: string) => {
    const t = authToken || token;
    if (!t) return;
    setLoadingKPIs(true);
    try {
      const url = cemeteryId 
        ? `${apiUrl}/api/v1/reportes/resumen?cementerio_id=${cemeteryId}` 
        : `${apiUrl}/api/v1/reportes/resumen`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResumenKPIs(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingKPIs(false);
    }
  };

  const handleDownloadReportCsv = async (tipo: string, customCategory?: string) => {
    if (!token) return;
    setDownloadingReport(tipo);
    try {
      const params = new URLSearchParams();
      params.set("tipo", tipo);
      if (reportCemetery) params.set("cementerio_id", reportCemetery);
      if (reportFechaDesde) params.set("fecha_desde", reportFechaDesde);
      if (reportFechaHasta) params.set("fecha_hasta", reportFechaHasta);
      if (customCategory) params.set("categoria_venc", customCategory);

      const res = await fetch(`${apiUrl}/api/v1/reportes/exportar/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("No se pudo descargar el reporte. Verifique permisos de su grupo.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_${tipo}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Error al descargar reporte");
    } finally {
      setDownloadingReport(null);
    }
  };

  // User Activity Log State in Admin Tab
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityResumen, setActivityResumen] = useState({
    total_movimientos: 0,
    usuarios_unicos: 0,
    ips_unicas: 0,
    modificaciones_count: 0,
    lecturas_count: 0,
    errores_count: 0,
  });
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityModule, setActivityModule] = useState("todos");
  const [activityMethod, setActivityMethod] = useState("todos");
  const [activityStatus, setActivityStatus] = useState("todos");
  const [activityUser, setActivityUser] = useState("todos");
  const [activityDateRange, setActivityDateRange] = useState("todos");
  const [activityPage, setActivityPage] = useState(0);
  const [activityLimit, setActivityLimit] = useState(25);
  const [activityAutoRefresh, setActivityAutoRefresh] = useState(false);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<any | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [exportingActivityCsv, setExportingActivityCsv] = useState(false);

  const fetchActivityLogs = async (authToken?: string) => {
    const t = authToken || token;
    if (!t) return;
    setLoadingActivity(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", String(activityLimit));
      params.append("offset", String(activityPage * activityLimit));
      if (activitySearch.trim()) params.append("q", activitySearch.trim());
      if (activityModule !== "todos") params.append("modulo", activityModule);
      if (activityMethod !== "todos") params.append("metodo", activityMethod);
      if (activityStatus !== "todos") params.append("status_tipo", activityStatus);
      if (activityUser !== "todos") params.append("username", activityUser);

      if (activityDateRange === "hoy") {
        const todayStr = new Date().toISOString().split("T")[0];
        params.append("fecha_desde", todayStr);
      } else if (activityDateRange === "7dias") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append("fecha_desde", d.toISOString().split("T")[0]);
      } else if (activityDateRange === "30dias") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append("fecha_desde", d.toISOString().split("T")[0]);
      }

      const res = await fetch(`${apiUrl}/api/v1/auditoria/actividad?${params.toString()}`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.items || []);
        setActivityTotal(data.total || 0);
        if (data.resumen) {
          setActivityResumen(data.resumen);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleExportActivityCsv = async () => {
    const t = token;
    if (!t) return;
    setExportingActivityCsv(true);
    try {
      const params = new URLSearchParams();
      if (activitySearch.trim()) params.append("q", activitySearch.trim());
      if (activityModule !== "todos") params.append("modulo", activityModule);
      if (activityMethod !== "todos") params.append("metodo", activityMethod);
      if (activityStatus !== "todos") params.append("status_tipo", activityStatus);
      
      const res = await fetch(`${apiUrl}/api/v1/auditoria/actividad/exportar/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `registro_actividad_usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    } finally {
      setExportingActivityCsv(false);
    }
  };

  // Check stored token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("cem_auth_token");
    const savedUser = localStorage.getItem("cem_auth_user");
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
      fetchUsuarios(savedToken);
      fetchGrupos(savedToken);
    }
    fetchPortalConfig();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCreateModal(false);
        setShowGroupModal(false);
        setShowAssignModal(false);
        setShowEditModal(false);
        setShowPasswordModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeTab === "reportes" && token) {
      fetchResumenKPIs(token, reportCemetery);
    } else if (activeTab === "actividad" && token) {
      fetchActivityLogs(token);
    }
  }, [activeTab, reportCemetery, activitySearch, activityModule, activityMethod, activityStatus, activityUser, activityDateRange, activityPage, activityLimit, token]);

  useEffect(() => {
    if (!activityAutoRefresh || activeTab !== "actividad" || !token) return;
    const interval = setInterval(() => {
      fetchActivityLogs(token);
    }, 10000);
    return () => clearInterval(interval);
  }, [activityAutoRefresh, activeTab, token, activitySearch, activityModule, activityMethod, activityStatus, activityUser, activityDateRange, activityPage, activityLimit]);

  const handleLogin = async (overrideUser?: string, overridePass?: string) => {
    const u = (overrideUser || loginUsername).trim();
    const p = overridePass || loginPassword;
    setLoginLoading(true);
    setLoginError(null);
    setRoleError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al iniciar sesión.");
      }

      setToken(data.access_token);
      const userObj = {
        username: data.username,
        nombre_completo: data.nombre_completo,
        role: data.role || data.rol,
        rol: data.rol || data.role,
        grupo_id: data.grupo_id,
      };
      setCurrentUser(userObj);
      localStorage.setItem("cem_auth_token", data.access_token);
      localStorage.setItem("cem_auth_user", JSON.stringify(userObj));
      window.dispatchEvent(new Event("cem_auth_change"));
      window.dispatchEvent(new Event("storage"));

      fetchUsuarios(data.access_token);
      fetchGrupos(data.access_token);
      fetchPortalConfig();
    } catch (err: any) {
      setLoginError(err.message || "Error al autenticar contra el servidor.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setRoleError(null);
    localStorage.removeItem("cem_auth_token");
    localStorage.removeItem("cem_auth_user");
    window.dispatchEvent(new Event("cem_auth_change"));
    window.dispatchEvent(new Event("storage"));
    setUsuarios([]);
    setGrupos([]);
  };

  const fetchUsuarios = async (authToken: string) => {
    setLoadingUsers(true);
    setRoleError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/usuarios`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      } else if (res.status === 401) {
        handleLogout();
        setLoginError("Su sesión ha expirado o no es válida. Por favor ingrese nuevamente.");
      } else if (res.status === 403) {
        setRoleError("La cuenta activa no posee permisos de ADMINISTRADOR. Para listar o crear funcionarios se requiere nivel de Administrador según Ley 21.719.");
      } else {
        const data = await res.json().catch(() => ({}));
        setRoleError(data.detail || "Error al cargar la lista de usuarios.");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setRoleError("Error de conexión al obtener usuarios desde " + apiUrl);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchGrupos = async (authToken: string) => {
    setLoadingGrupos(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/grupos`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGrupos(data);
      }
    } catch (err) {
      console.error("Error fetching grupos:", err);
    } finally {
      setLoadingGrupos(false);
    }
  };

  const fetchPortalConfig = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/portal/config`);
      if (res.ok) {
        const data = await res.json();
        setPortalConfig(data);
      }
    } catch (err) {
      console.error("Error fetching portal config:", err);
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleSavePortalConfig = async (override?: Partial<typeof portalConfig>) => {
    setSavingPortal(true);
    setPortalSuccessMsg(null);
    try {
      const authToken = token || localStorage.getItem("cem_auth_token");
      const payload = {
        permitir_lista_fallecidos: override?.permitir_lista_fallecidos !== undefined ? override.permitir_lista_fallecidos : portalConfig.permitir_lista_fallecidos,
        permitir_busqueda_publica: override?.permitir_busqueda_publica !== undefined ? override.permitir_busqueda_publica : portalConfig.permitir_busqueda_publica,
        titulo_portal: override?.titulo_portal || portalConfig.titulo_portal,
        mensaje_portal: override?.mensaje_portal || portalConfig.mensaje_portal,
      };
      const res = await fetch(`${apiUrl}/api/v1/portal/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setPortalConfig(data);
        setPortalSuccessMsg(
          data.permitir_lista_fallecidos
            ? "Configuración guardada: Los visitantes ahora pueden ver la lista de fallecidos."
            : "Configuración guardada: La lista de fallecidos está protegida y oculta para visitantes (solo certificados)."
        );
        setTimeout(() => setPortalSuccessMsg(null), 4500);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Error al actualizar configuración del portal.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingPortal(false);
    }
  };

  const suggestValidRut = () => {
    const validRuts = ["12.345.678-5", "15.678.912-7", "18.234.567-9", "11.111.111-1", "13.579.246-8"];
    const randomRut = validRuts[Math.floor(Math.random() * validRuts.length)];
    setFormRut(randomRut);
  };

  const suggestSecurePassword = () => {
    setFormPassword("Segura2026!Municipal");
  };

  const handleDesbloquear = async (usuarioId: number, username: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/usuarios/${usuarioId}/desbloquear`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Usuario ${username} desbloqueado exitosamente.`);
        fetchUsuarios(token);
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.detail || "Error al desbloquear usuario.");
      }
    } catch (err) {
      alert("Error de conexión al desbloquear.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const payload: any = {
        username: formUsername.trim(),
        email: formEmail.trim() || undefined,
        rut: formRut.trim() || undefined,
        nombre_completo: formNombre.trim(),
        password: formPassword,
        rol: formRol,
      };

      if (formGrupoId !== "") {
        payload.grupo_id = Number(formGrupoId);
      }

      const res = await fetch(`${apiUrl}/api/v1/auth/usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al crear el usuario.");
      }

      setCreateSuccess(`Usuario '${data.username}' (${data.rol}) creado exitosamente y registrado en la cadena HMAC.`);
      fetchUsuarios(token);
      fetchGrupos(token);

      // Reset form
      setFormNombre("");
      setFormUsername("");
      setFormEmail("");
      setFormRut("");
      setFormGrupoId("");
      setFormPassword("Segura2026!Municipal");

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 2000);
    } catch (err: any) {
      setCreateError(err.message || "Error al procesar la solicitud.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEditModal = (u: Usuario) => {
    setSelectedUserForEdit(u);
    setEditNombre(u.nombre_completo);
    setEditEmail(u.email || "");
    setEditRut(u.rut || "");
    setEditRol(u.rol);
    setEditGrupoId(u.grupo_id || "");
    setEditActivo(u.activo);
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const authToken = token || localStorage.getItem("cem_auth_token");
      const res = await fetch(`${apiUrl}/api/v1/auth/usuarios/${selectedUserForEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          nombre_completo: editNombre.trim(),
          email: editEmail.trim() || null,
          rut: editRut.trim() || null,
          rol: editRol,
          grupo_id: editGrupoId === "" ? 0 : Number(editGrupoId),
          activo: editActivo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al actualizar funcionario.");
      }

      setActionMessage(`Funcionario '${data.nombre_completo}' actualizado correctamente.`);
      setTimeout(() => setActionMessage(null), 4000);
      setShowEditModal(false);
      if (authToken) {
        fetchUsuarios(authToken);
        fetchGrupos(authToken);
      }
    } catch (err: any) {
      setEditError(err.message || "Error al procesar la actualización.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenPasswordModal = (u: Usuario) => {
    setSelectedUserForPassword(u);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;

    if (newPassword.length < 12) {
      setPasswordError("La contraseña debe tener al menos 12 caracteres (Ley 21.719 / ASVS L2).");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas ingresadas no coinciden.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);

    try {
      const authToken = token || localStorage.getItem("cem_auth_token");
      const res = await fetch(`${apiUrl}/api/v1/auth/usuarios/${selectedUserForPassword.id}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al cambiar la contraseña.");
      }

      setActionMessage(`Contraseña actualizada exitosamente para '${selectedUserForPassword.username}'.`);
      setTimeout(() => setActionMessage(null), 4000);
      setShowPasswordModal(false);
      if (authToken) {
        fetchUsuarios(authToken);
      }
    } catch (err: any) {
      setPasswordError(err.message || "Error al cambiar contraseña.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Open modal to create a group
  const handleOpenCreateGroup = () => {
    setEditingGroupId(null);
    setGroupNombre("");
    setGroupDesc("");
    const initialPerms: Record<string, "NONE" | "READ" | "WRITE"> = {};
    ALL_MODULES.forEach((m) => {
      initialPerms[m] = "READ"; // Default friendly read
    });
    setGroupPermisos(initialPerms);
    setGroupError(null);
    setShowGroupModal(true);
  };

  // Open modal to edit a group's permissions
  const handleOpenEditGroup = (g: Grupo) => {
    setEditingGroupId(g.id);
    setGroupNombre(g.nombre);
    setGroupDesc(g.descripcion || "");
    const permsMap: Record<string, "NONE" | "READ" | "WRITE"> = {};
    ALL_MODULES.forEach((m) => {
      const existing = g.permisos.find((p) => p.modulo === m);
      permsMap[m] = existing ? (existing.acceso as any) : "NONE";
    });
    setGroupPermisos(permsMap);
    setGroupError(null);
    setShowGroupModal(true);
  };

  // Save Group (Create or Update)
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!groupNombre.trim()) {
      setGroupError("El nombre del grupo es obligatorio.");
      return;
    }

    setGroupSaving(true);
    setGroupError(null);

    try {
      const formattedPermisos = ALL_MODULES.map((mod) => ({
        modulo: mod,
        acceso: groupPermisos[mod] || "NONE"
      }));

      const url = editingGroupId 
        ? `${apiUrl}/api/v1/grupos/${editingGroupId}`
        : `${apiUrl}/api/v1/grupos`;

      const method = editingGroupId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: groupNombre.trim(),
          descripcion: groupDesc.trim() || undefined,
          permisos: formattedPermisos
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al guardar el grupo.");
      }

      setActionMessage(
        editingGroupId 
          ? `Permisos del grupo '${groupNombre}' actualizados con sello HMAC.`
          : `Grupo '${groupNombre}' creado exitosamente con permisos granulares.`
      );
      fetchGrupos(token);
      fetchUsuarios(token);
      setShowGroupModal(false);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setGroupError(err.message || "Error al procesar el grupo.");
    } finally {
      setGroupSaving(false);
    }
  };

  // Delete custom group
  const handleDeleteGroup = async (g: Grupo) => {
    if (g.es_sistema) {
      alert("Los grupos base del sistema están protegidos por Ley y no pueden ser eliminados.");
      return;
    }
    if (!confirm(`¿Está seguro de eliminar el grupo '${g.nombre}'? Los usuarios asignados quedarán sin grupo.`)) {
      return;
    }
    if (!token) return;

    try {
      const res = await fetch(`${apiUrl}/api/v1/grupos/${g.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Grupo '${g.nombre}' eliminado correctamente.`);
        fetchGrupos(token);
        fetchUsuarios(token);
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.detail || "Error al eliminar grupo.");
      }
    } catch (err) {
      alert("Error de conexión al eliminar grupo.");
    }
  };

  // Assign User to Group
  const handleAssignUserToGroup = async () => {
    if (!token || !selectedUserForAssign || selectedTargetGroupId === "") return;
    setAssignLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/v1/grupos/${selectedTargetGroupId}/usuarios/${selectedUserForAssign.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al asignar grupo.");
      }

      setActionMessage(data.message || `Funcionario asignado al grupo con éxito.`);
      fetchUsuarios(token);
      fetchGrupos(token);
      setShowAssignModal(false);
      setSelectedUserForAssign(null);
      setSelectedTargetGroupId("");
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Error al asignar usuario al grupo.");
    } finally {
      setAssignLoading(false);
    }
  };

  // Apply Quick Preset to group permissions in modal
  const applyPreset = (preset: "read_all" | "write_ops" | "admin_all" | "clear") => {
    const updated: Record<string, "NONE" | "READ" | "WRITE"> = {};
    ALL_MODULES.forEach((m) => {
      if (preset === "read_all") {
        updated[m] = "READ";
      } else if (preset === "admin_all") {
        updated[m] = "WRITE";
      } else if (preset === "clear") {
        updated[m] = "NONE";
      } else if (preset === "write_ops") {
        if (["INHUMACIONES", "UBICACIONES", "ARRIENDOS", "CERTIFICADOS", "CAMPO"].includes(m)) {
          updated[m] = "WRITE";
        } else if (["AUDITORIA", "CONFIGURACION"].includes(m)) {
          updated[m] = "READ";
        } else {
          updated[m] = "NONE";
        }
      }
    });
    setGroupPermisos(updated);
  };

  // Password policy check
  const pwLength = formPassword.length >= 12;
  const pwUpper = /[A-Z]/.test(formPassword);
  const pwLower = /[a-z]/.test(formPassword);
  const pwDigit = /[0-9]/.test(formPassword);
  const pwSpecial = /[^A-Za-z0-9]/.test(formPassword);
  const isPasswordValid = pwLength && pwUpper && pwLower && pwDigit && pwSpecial;

  // Filter users
  const filteredUsers = usuarios.filter((u) => {
    const matchesSearch =
      u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.rut && u.rut.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === "ALL" || u.rol === filterRole;
    const matchesGroup = filterGroup === "ALL" || 
      (filterGroup === "NONE" ? !u.grupo_id : u.grupo_id === Number(filterGroup));
    return matchesSearch && matchesRole && matchesGroup;
  });

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case "ADMINISTRADOR":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300";
      case "ADMINISTRATIVO":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300";
    }
  };

  const getPermissionBadge = (acceso: string) => {
    switch (acceso) {
      case "WRITE":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 font-bold";
      case "READ":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 font-semibold";
      default:
        return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 opacity-60";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner & Enterprise Header */}
      <div
        className="p-6 sm:p-8 rounded-2xl border shadow-sm relative overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))" }}
              >
                <Shield className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Control de Acceso y Gestión de Identidades (RBAC)
                </h1>
                <p className="text-xs sm:text-sm opacity-75">
                  Administración de funcionarios, grupos municipales y matriz de permisos por función (Ley 21.719 & ASVS L2).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/temas"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all hover:scale-105"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface)",
              }}
            >
              <Palette className="w-4 h-4 text-emerald-600" />
              <span>Identidad Visual & Temas</span>
            </Link>

            <a
              href={`${apiUrl}/api/v1/export/exit-package`}
              download="cem_exit_package.zip"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:scale-105"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <Download className="w-4 h-4" />
              <span>Exit Package (ZIP)</span>
            </a>
          </div>
        </div>

        {/* Global Security Badges */}
        <div className="mt-5 pt-4 border-t flex flex-wrap items-center gap-4 text-xs opacity-90" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center space-x-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Trazabilidad Criptográfica HMAC SHA-256</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400">
            <Lock className="w-4 h-4" />
            <span>Bloqueo Preventivo tras 5 Intentos Fallidos</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1.5 text-purple-600 dark:text-purple-400">
            <Key className="w-4 h-4" />
            <span>Contraseñas Seguras $\ge$ 12 Caracteres</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400">
            <Layers className="w-4 h-4" />
            <span>8 Módulos Funcionales Granulares</span>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center space-x-3 text-sm animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span className="font-medium">{actionMessage}</span>
        </div>
      )}

      {/* Auth Status / Login Section */}
      {!token ? (
        <div
          className="p-8 sm:p-12 rounded-2xl border shadow-md space-y-6 max-w-2xl mx-auto"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="text-center space-y-2">
            <div 
              className="w-14 h-14 rounded-2xl text-white flex items-center justify-center mx-auto mb-4 shadow-md"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))" }}
            >
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Autenticación Administrativa Municipal
            </h2>
            <p className="text-xs sm:text-sm opacity-75 max-w-md mx-auto">
              Ingrese con sus credenciales institucionales o use uno de los perfiles de demostración autorizados.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">Usuario</label>
              <input
                id="input-login-username"
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">Contraseña</label>
              <input
                id="input-login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                }}
              />
            </div>
            <button
              id="btn-login-submit"
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white shadow transition-all disabled:opacity-50 flex items-center justify-center space-x-2 hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <Lock className="w-4 h-4" />
              <span>{loginLoading ? "Iniciando sesión..." : "Ingresar con Usuario / Contraseña"}</span>
            </button>

            {/* Quick Demo Logins */}
            <div className="pt-5 border-t text-center space-y-2.5" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                Acceso Rápido con 1 Clic (Perfiles Nominativos)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  id="btn-quick-login-admin"
                  type="button"
                  onClick={() => handleLogin("admin", "AdminCem2026!")}
                  className="p-3 rounded-xl border text-xs font-medium bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 transition-all text-left shadow-2xs"
                >
                  <div className="font-extrabold flex items-center space-x-1.5">
                    <span>🛡️ Administrador</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">Carlos Aránguiz (Total)</div>
                </button>
                <button
                  id="btn-quick-login-operador"
                  type="button"
                  onClick={() => handleLogin("operador", "OperadorCem2026!")}
                  className="p-3 rounded-xl border text-xs font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 transition-all text-left shadow-2xs"
                >
                  <div className="font-extrabold flex items-center space-x-1.5">
                    <span>👷 Operador</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">Luis Gómez (Operativo)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLogin("consulta", "ConsultaCem2026!")}
                  className="p-3 rounded-xl border text-xs font-medium bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 transition-all text-left shadow-2xs"
                >
                  <div className="font-extrabold flex items-center space-x-1.5">
                    <span>👁️ Visita</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">Atención Ciudadana</div>
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Authenticated Session Dashboard */
        <div className="space-y-6">
          {/* Active Session Info Bar */}
          <div
            className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {currentUser?.username?.substring(0, 2).toUpperCase() || "AD"}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm">{currentUser?.nombre_completo || currentUser?.username}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getRoleBadge(currentUser?.role || "")}`}>
                    {currentUser?.role || "USUARIO"}
                  </span>
                </div>
                <div className="text-xs opacity-70">
                  Funcionario activo: <code className="font-mono text-primary font-semibold">{currentUser?.username}</code>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  fetchUsuarios(token);
                  fetchGrupos(token);
                }}
                disabled={loadingUsers || loadingGrupos}
                className="p-2 rounded-xl border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all"
                title="Actualizar datos"
                style={{ borderColor: "var(--color-border)" }}
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers || loadingGrupos ? "animate-spin" : ""}`} />
              </button>

              <button
                id="btn-admin-logout"
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

          {/* Role Error / Warning Banner */}
          {roleError && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{roleError}</span>
              </div>
              <button
                onClick={() => handleLogin("admin", "AdminCem2026!")}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5 whitespace-nowrap"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Reconectar como Administrador</span>
              </button>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div className="text-xs opacity-70 uppercase font-bold tracking-wider">Funcionarios</div>
              <div className="text-2xl font-black mt-1">{usuarios.length}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">● Cuentas Nominativas</div>
            </div>
            <div className="p-4 rounded-xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div className="text-xs opacity-70 uppercase font-bold tracking-wider">Grupos RBAC</div>
              <div className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">
                {grupos.length}
              </div>
              <div className="text-[11px] opacity-60">8 Módulos Granulares</div>
            </div>
            <div className="p-4 rounded-xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div className="text-xs opacity-70 uppercase font-bold tracking-wider">Bloqueados</div>
              <div className="text-2xl font-black mt-1 text-red-600 dark:text-red-400">
                {usuarios.filter((u) => u.bloqueado_hasta !== null).length}
              </div>
              <div className="text-[11px] opacity-60">Fallo de Claves (5 max)</div>
            </div>
            <div className="p-4 rounded-xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div className="text-xs opacity-70 uppercase font-bold tracking-wider">Seguridad 2FA</div>
              <div className="text-2xl font-black mt-1 text-blue-600 dark:text-blue-400">
                {usuarios.filter((u) => u.totp_enabled).length}
              </div>
              <div className="text-[11px] opacity-60">Autenticación Multifactor</div>
            </div>
          </div>

          {/* Tab Navigation: Funcionarios vs Grupos RBAC */}
          <div className="flex border-b" style={{ borderColor: "var(--color-border)" }}>
            <button
              id="tab-btn-usuarios"
              onClick={() => setActiveTab("usuarios")}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
                activeTab === "usuarios"
                  ? "border-primary text-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Nómina de Funcionarios ({usuarios.length})</span>
            </button>
            <button
              id="tab-btn-grupos"
              onClick={() => setActiveTab("grupos")}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
                activeTab === "grupos"
                  ? "border-primary text-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Grupos & Matriz de Permisos ({grupos.length})</span>
            </button>
            <button
              id="tab-btn-portal"
              onClick={() => setActiveTab("portal")}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
                activeTab === "portal"
                  ? "border-primary text-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Portal Público & Visitantes</span>
              {portalConfig.permitir_lista_fallecidos ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                  Abierto
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                  Estricto
                </span>
              )}
            </button>
            <button
              id="tab-btn-reportes"
              onClick={() => setActiveTab("reportes")}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
                activeTab === "reportes"
                  ? "border-primary text-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reportes & Estadísticas</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold">
                DS 357
              </span>
            </button>
            <button
              id="tab-btn-actividad"
              onClick={() => setActiveTab("actividad")}
              className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
                activeTab === "actividad"
                  ? "border-primary text-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Actividad de Usuarios (Log)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold">
                Admin
              </span>
            </button>
          </div>

          {/* TAB 1: FUNCIONARIOS */}
          {activeTab === "usuarios" && (
            <div
              className="p-6 rounded-2xl border shadow-sm space-y-4"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center space-x-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>Nómina de Funcionarios Municipales</span>
                  </h2>
                  <p className="text-xs opacity-70">
                    Cuentas nominativas con trazabilidad individual y asignación de grupo funcional.
                  </p>
                </div>

                {currentUser?.role === "ADMINISTRADOR" && (
                  <button
                    id="btn-open-create-user"
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Nuevo Funcionario</span>
                  </button>
                )}
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 opacity-50" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre, usuario, RUT o correo institucional..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-3 py-2 rounded-xl border text-sm font-semibold outline-none"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <option value="ALL">Todos los Roles</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="ADMINISTRATIVO">Administrativo</option>
                  <option value="VISITA">Visita / Consulta</option>
                </select>

                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="px-3 py-2 rounded-xl border text-sm font-semibold outline-none"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <option value="ALL">Todos los Grupos</option>
                  <option value="NONE">Sin Grupo Asignado</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
                <table className="w-full text-left text-sm">
                  <thead
                    className="text-xs uppercase font-bold border-b"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <tr>
                      <th className="py-3 px-4">Funcionario / Nombre</th>
                      <th className="py-3 px-4">Usuario & RUT</th>
                      <th className="py-3 px-4">Grupo Asignado</th>
                      <th className="py-3 px-4">Rol Base</th>
                      <th className="py-3 px-4">Estado / Seguridad</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center opacity-60 text-sm">
                          {loadingUsers ? "Cargando nómina de usuarios..." : "No se encontraron usuarios coincidentes."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isLocked = u.bloqueado_hasta !== null;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-sm">{u.nombre_completo}</div>
                              <div className="text-xs opacity-60">{u.email || "Sin correo"}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono text-xs font-semibold text-primary">{u.username}</div>
                              <div className="text-xs opacity-60 font-mono">{u.rut || "—"}</div>
                            </td>
                            <td className="py-3 px-4">
                              {u.grupo_nombre ? (
                                <button
                                  onClick={() => {
                                    if (currentUser?.role === "ADMINISTRADOR") {
                                      setSelectedUserForAssign(u);
                                      setSelectedTargetGroupId(u.grupo_id || "");
                                      setShowAssignModal(true);
                                    }
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:scale-105 transition-transform"
                                  title="Clic para cambiar grupo"
                                >
                                  <Layers className="w-3 h-3 text-indigo-500" />
                                  <span>{u.grupo_nombre}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (currentUser?.role === "ADMINISTRADOR") {
                                      setSelectedUserForAssign(u);
                                      setSelectedTargetGroupId("");
                                      setShowAssignModal(true);
                                    }
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:border-solid hover:border-primary transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Asignar Grupo</span>
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadge(u.rol)}`}>
                                {u.rol}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isLocked ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                  <Lock className="w-3 h-3" />
                                  <span>Bloqueado (5 fallos)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Activo</span>
                                </span>
                              )}
                              {u.totp_enabled && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold">
                                  2FA
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {isLocked && currentUser?.role === "ADMINISTRADOR" && (
                                  <button
                                    onClick={() => handleDesbloquear(u.id, u.username)}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all"
                                    title="Desbloquear cuenta bloqueada"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Desbloquear</span>
                                  </button>
                                )}
                                {currentUser?.role === "ADMINISTRADOR" && (
                                  <>
                                    <button
                                      id={`btn-edit-user-${u.id}`}
                                      onClick={() => handleOpenEditModal(u)}
                                      className="p-1.5 rounded-lg border hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors"
                                      title="Editar funcionario"
                                      style={{ borderColor: "var(--color-border)" }}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      id={`btn-password-user-${u.id}`}
                                      onClick={() => handleOpenPasswordModal(u)}
                                      className="p-1.5 rounded-lg border hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-colors"
                                      title="Cambiar contraseña"
                                      style={{ borderColor: "var(--color-border)" }}
                                    >
                                      <Key className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      id={`btn-assign-group-${u.id}`}
                                      onClick={() => {
                                        setSelectedUserForAssign(u);
                                        setSelectedTargetGroupId(u.grupo_id || "");
                                        setShowAssignModal(true);
                                      }}
                                      className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-primary transition-colors"
                                      title="Cambiar grupo asignado"
                                      style={{ borderColor: "var(--color-border)" }}
                                    >
                                      <Layers className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: GRUPOS Y MATRIZ DE PERMISOS */}
          {activeTab === "grupos" && (
            <div
              className="p-6 rounded-2xl border shadow-sm space-y-6"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Grupos de Usuarios y Matriz de Permisos Granular</span>
                  </h2>
                  <p className="text-xs opacity-70">
                    Defina perfiles de acceso por función municipal con niveles: <strong>Sin Acceso (NONE)</strong>, <strong>Solo Lectura (READ)</strong> o <strong>Lectura y Escritura (WRITE)</strong>.
                  </p>
                </div>

                {currentUser?.role === "ADMINISTRADOR" && (
                  <button
                    id="btn-open-create-group"
                    onClick={handleOpenCreateGroup}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Crear Nuevo Grupo</span>
                  </button>
                )}
              </div>

              {/* Groups Grid / Cards */}
              <div className="space-y-4">
                {grupos.map((g) => {
                  return (
                    <div
                      key={g.id}
                      className="p-5 rounded-2xl border shadow-xs space-y-4 hover:border-primary/50 transition-all"
                      style={{
                        backgroundColor: "var(--color-bg)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      {/* Group Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5">
                            <span className="font-extrabold text-base tracking-tight">
                              {g.nombre}
                            </span>
                            {g.es_sistema ? (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                                Predefinido del Sistema
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                Personalizado
                              </span>
                            )}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                              {g.total_usuarios} {g.total_usuarios === 1 ? "funcionario" : "funcionarios"}
                            </span>
                          </div>
                          {g.descripcion && (
                            <p className="text-xs opacity-75">
                              {g.descripcion}
                            </p>
                          )}
                        </div>

                        {/* Group Actions */}
                        {currentUser?.role === "ADMINISTRADOR" && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleOpenEditGroup(g)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                              style={{ borderColor: "var(--color-border)" }}
                            >
                              <Edit3 className="w-3.5 h-3.5 text-primary" />
                              <span>Editar Permisos</span>
                            </button>

                            {!g.es_sistema && (
                              <button
                                onClick={() => handleDeleteGroup(g)}
                                className="p-1.5 rounded-xl border text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                style={{ borderColor: "var(--color-border)" }}
                                title="Eliminar grupo personalizado"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Permission Matrix Grid for this group */}
                      <div className="pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">
                          Matriz de Permisos por Módulo:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {ALL_MODULES.map((mod) => {
                            const p = g.permisos.find((item) => item.modulo === mod);
                            const acceso = p ? p.acceso : "NONE";
                            const info = MODULE_INFO[mod];
                            const Icon = info?.icon || Shield;
                            return (
                              <div
                                key={mod}
                                className="p-2.5 rounded-xl border flex flex-col justify-between gap-1.5"
                                style={{
                                  backgroundColor: "var(--color-surface)",
                                  borderColor: "var(--color-border)"
                                }}
                              >
                                <div className="flex items-center space-x-1.5">
                                  <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="text-xs font-bold truncate">
                                    {info?.label || mod}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] px-2 py-0.5 rounded border ${getPermissionBadge(acceso)}`}>
                                    {acceso === "WRITE" ? "Lectura & Escritura" : acceso === "READ" ? "Solo Lectura" : "Sin Acceso"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PORTAL PÚBLICO & ACCESO VISITANTES */}
          {activeTab === "portal" && (
            <div className="space-y-6">
              {/* Main Policy Card */}
              <div
                className="p-6 sm:p-8 rounded-2xl border shadow-sm transition-all"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div
                  className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
                          Control de Acceso para Visitantes (Portal Ciudadano)
                        </h2>
                        <p className="text-xs opacity-70">
                          Configure qué información y módulos están disponibles para visitantes no autenticados en el portal municipal.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Pill Badge */}
                  <div className="self-start">
                    {portalConfig.permitir_lista_fallecidos ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>MODO ABIERTO: CERTIFICADOS + LISTA DE FALLECIDOS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>MODO RESTRINGIDO: SOLO CERTIFICADOS OFICIALES</span>
                      </span>
                    )}
                  </div>
                </div>

                {portalSuccessMsg && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold">{portalSuccessMsg}</span>
                  </div>
                )}

                {/* Configuration Toggles */}
                <div className="mt-6 space-y-6">
                  {/* Primary Toggle: Death List Visibility */}
                  <div
                    className="p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    style={{
                      borderColor: portalConfig.permitir_lista_fallecidos ? "rgba(245, 158, 11, 0.4)" : "var(--color-border)",
                      backgroundColor: isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                    }}
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-sm sm:text-base" style={{ color: "var(--color-text)" }}>
                          Permitir a visitantes ver la Lista de Fallecidos (Inhumaciones)
                        </h4>
                      </div>
                      <p className="text-xs opacity-70 leading-relaxed">
                        {portalConfig.permitir_lista_fallecidos
                          ? "ACTIVADO: Los visitantes públicos pueden consultar y buscar en la nómina de personas sepultadas (con diagnóstico médico protegido por Ley 21.719)."
                          : "DESACTIVADO (Estricto): Los visitantes solo pueden consultar y verificar Certificados Oficiales mediante Folio o QR. La lista de fallecidos queda oculta y restringida."}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                        {portalConfig.permitir_lista_fallecidos ? "Permitido" : "Oculto"}
                      </span>
                      <button
                        type="button"
                        id="toggle-permitir-fallecidos"
                        onClick={() => {
                          const nextVal = !portalConfig.permitir_lista_fallecidos;
                          setPortalConfig((prev) => ({ ...prev, permitir_lista_fallecidos: nextVal }));
                          handleSavePortalConfig({ permitir_lista_fallecidos: nextVal });
                        }}
                        disabled={savingPortal}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                          portalConfig.permitir_lista_fallecidos ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            portalConfig.permitir_lista_fallecidos ? "translate-x-7" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Secondary Form Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold opacity-75 uppercase tracking-wider">
                        Título del Portal Ciudadano
                      </label>
                      <input
                        type="text"
                        value={portalConfig.titulo_portal}
                        onChange={(e) => setPortalConfig((prev) => ({ ...prev, titulo_portal: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary/20"
                        style={{
                          backgroundColor: "var(--color-bg)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold opacity-75 uppercase tracking-wider">
                        Mensaje Normativo (Ley 21.719)
                      </label>
                      <input
                        type="text"
                        value={portalConfig.mensaje_portal}
                        onChange={(e) => setPortalConfig((prev) => ({ ...prev, mensaje_portal: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary/20"
                        style={{
                          backgroundColor: "var(--color-bg)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <div className="text-xs opacity-60">
                      {portalConfig.updated_at && (
                        <span>
                          Última modificación: {new Date(portalConfig.updated_at).toLocaleString()}{" "}
                          {portalConfig.actualizado_por ? `por @${portalConfig.actualizado_por}` : ""}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <Link
                        href="/"
                        target="_blank"
                        className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver Portal en Vivo</span>
                      </Link>

                      <button
                        type="button"
                        id="save-portal-config-btn"
                        onClick={() => handleSavePortalConfig()}
                        disabled={savingPortal}
                        className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        {savingPortal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{savingPortal ? "Guardando..." : "Guardar Configuración"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Citizen Portal Preview Simulation */}
              <div
                className="p-6 rounded-2xl border"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider opacity-70 flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span>Resumen de Visibilidad Pública para Ciudadanos</span>
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 opacity-80">
                    Reglas en tiempo real
                  </span>
                </div>

                <div
                  className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50 space-y-3"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileCheck className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className="text-sm font-bold">Verificación de Certificados Oficiales</div>
                        <div className="text-xs opacity-60">Consulta por Folio o escaneo de código QR</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      SIEMPRE VISIBLE
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <Users className={`w-5 h-5 ${portalConfig.permitir_lista_fallecidos ? "text-amber-500" : "text-rose-400"}`} />
                      <div>
                        <div className="text-sm font-bold">Lista de Fallecidos & Libros de Sepultación</div>
                        <div className="text-xs opacity-60">
                          {portalConfig.permitir_lista_fallecidos
                            ? "Visible para visitantes (diagnóstico médico protegido)"
                            : "Oculto para visitantes (solo funcionarios autenticados)"}
                        </div>
                      </div>
                    </div>
                    {portalConfig.permitir_lista_fallecidos ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        PERMITIDO PARA VISITANTES
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        BLOQUEADO PARA VISITANTES
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REPORTES & ESTADÍSTICAS MUNICIPALES */}
          {activeTab === "reportes" && (
            <div className="space-y-6">
              {/* Header Card */}
              <div
                className="p-6 sm:p-8 rounded-2xl border shadow-sm transition-all"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div
                  className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
                          Reportes & Estadísticas Municipales
                        </h2>
                        <p className="text-xs opacity-70">
                          Consola administrativa de libros oficiales, vencimiento de arriendos, capacidad territorial y control de faenas según Decreto Supremo 357 y normativa de Contraloría (CGR).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-start">
                    <Link
                      href="/reportes"
                      id="btn-open-full-reports"
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    >
                      <span>Abrir Centro de Reportes Completo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Filters */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-bold opacity-75">Cementerio:</label>
                      <select
                        id="admin-report-cemetery-select"
                        value={reportCemetery}
                        onChange={(e) => setReportCemetery(e.target.value)}
                        className="text-xs font-semibold px-3 py-2 rounded-xl border bg-transparent"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                      >
                        <option value="">Ambos Cementerios</option>
                        <option value="1">Cementerio Municipal de San Carlos</option>
                        <option value="2">Cementerio Municipal de Cachapoal</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-bold opacity-75">Desde:</label>
                      <input
                        type="date"
                        id="admin-report-date-from"
                        value={reportFechaDesde}
                        onChange={(e) => setReportFechaDesde(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-xl border bg-transparent"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-bold opacity-75">Hasta:</label>
                      <input
                        type="date"
                        id="admin-report-date-to"
                        value={reportFechaHasta}
                        onChange={(e) => setReportFechaHasta(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-xl border bg-transparent"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchResumenKPIs(token, reportCemetery)}
                    disabled={loadingKPIs}
                    className="flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingKPIs ? "animate-spin" : ""}`} />
                    <span>Actualizar Métricas</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Inhumaciones */}
                <div
                  className="p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">Inhumaciones</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
                    {resumenKPIs ? resumenKPIs.inhumaciones.total.toLocaleString() : "..."}
                  </div>
                  <p className="text-xs opacity-70 mt-1">Registros en Libro Oficial</p>
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--color-border)" }}>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{resumenKPIs?.inhumaciones.este_mes || 0} este mes
                    </span>
                    <span className="opacity-40">•</span>
                    <span className="opacity-70">
                      +{resumenKPIs?.inhumaciones.este_ano || 0} año
                    </span>
                  </div>
                </div>

                {/* 2. Capacidad Territorial */}
                <div
                  className="p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">Ocupación Territorial</span>
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
                    {resumenKPIs ? `${resumenKPIs.capacidad.tasa_ocupacion_pct}%` : "..."}
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {resumenKPIs ? `${resumenKPIs.capacidad.ocupados} ocupados de ${resumenKPIs.capacidad.total_espacios}` : "Cargando..."}
                  </p>
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--color-border)" }}>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {resumenKPIs?.capacidad.disponibles || 0} disponibles
                    </span>
                    <span className="opacity-40">•</span>
                    <span className="opacity-70">
                      {resumenKPIs?.capacidad.reservados || 0} reservas
                    </span>
                  </div>
                </div>

                {/* 3. Vencimientos */}
                <div
                  className="p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">Arriendos Vencidos</span>
                    <Clock className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                    {resumenKPIs ? resumenKPIs.vencimientos.vencidos.toLocaleString() : "..."}
                  </div>
                  <p className="text-xs opacity-70 mt-1">Requieren gestión o aviso</p>
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--color-border)" }}>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {resumenKPIs?.vencimientos.por_vencer_30d || 0} por vencer (30d)
                    </span>
                    <span className="opacity-40">•</span>
                    <span className="opacity-70">
                      {resumenKPIs?.vencimientos.total_vigentes || 0} vigentes
                    </span>
                  </div>
                </div>

                {/* 4. Operaciones & Maestros */}
                <div
                  className="p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">Faenas & Maestros</span>
                    <HardHat className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
                    {resumenKPIs ? resumenKPIs.maestros.activos : "..."}
                  </div>
                  <p className="text-xs opacity-70 mt-1">Maestros habilitados</p>
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--color-border)" }}>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {resumenKPIs?.exhumaciones_total || 0} exhumaciones
                    </span>
                    <span className="opacity-40">•</span>
                    <span className="opacity-70">
                      {resumenKPIs?.certificados_emitidos || 0} certificados
                    </span>
                  </div>
                </div>
              </div>

              {/* Official Reports Catalog Grid */}
              <div
                className="p-6 rounded-2xl border shadow-sm"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                      Catálogo de Libros Oficiales y Exportación de Datos
                    </h3>
                    <p className="text-xs opacity-70">
                      Generación de planillas compatibles con Microsoft Excel (codificación UTF-8 con BOM y delimitador estándar).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Report 1 */}
                  <div
                    className="p-5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
                          DS 357 Art. 48
                        </span>
                      </div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        Libro Oficial de Defunciones e Inhumaciones
                      </h4>
                      <p className="text-xs opacity-70 leading-relaxed">
                        Nómina legal de sepultaciones con RUT, folio de pase de defunción, coordenadas de sepultura y familiar responsable.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                      <span className="text-[11px] opacity-60">Exportación oficial</span>
                      <button
                        type="button"
                        id="btn-export-defunciones-admin"
                        onClick={() => handleDownloadReportCsv("defunciones")}
                        disabled={downloadingReport === "defunciones"}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingReport === "defunciones" ? "Generando..." : "Descargar CSV"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Report 2 */}
                  <div
                    className="p-5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300">
                          Finanzas & Cobranza
                        </span>
                      </div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        Control de Vencimiento de Arriendos
                      </h4>
                      <p className="text-xs opacity-70 leading-relaxed">
                        Contratos temporales vencidos y en plazo crítico (30, 60 y 90 días) para cobranza municipal y notificaciones.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                      <span className="text-[11px] opacity-60">Auditoría de aranceles</span>
                      <button
                        type="button"
                        id="btn-export-vencimientos-admin"
                        onClick={() => handleDownloadReportCsv("vencimientos")}
                        disabled={downloadingReport === "vencimientos"}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingReport === "vencimientos" ? "Generando..." : "Descargar CSV"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Report 3 */}
                  <div
                    className="p-5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Catastro Territorial
                        </span>
                      </div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        Censo de Capacidad & Ocupación GIS
                      </h4>
                      <p className="text-xs opacity-70 leading-relaxed">
                        Desglose territorial por cuartel, patio y pabellón con conteo de sepulturas disponibles, ocupadas y bloqueadas.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                      <span className="text-[11px] opacity-60">Balance físico</span>
                      <button
                        type="button"
                        id="btn-export-capacidad-admin"
                        onClick={() => handleDownloadReportCsv("capacidad")}
                        disabled={downloadingReport === "capacidad"}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingReport === "capacidad" ? "Generando..." : "Descargar CSV"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Report 4 */}
                  <div
                    className="p-5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          DS 357 / SEREMI
                        </span>
                      </div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        Libro de Exhumaciones & Reducciones
                      </h4>
                      <p className="text-xs opacity-70 leading-relaxed">
                        Registro cronológico de aperturas de sepultura, número de resolución sanitaria y destino de restos.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                      <span className="text-[11px] opacity-60">Control sanitario</span>
                      <button
                        type="button"
                        id="btn-export-exhumaciones-admin"
                        onClick={() => handleDownloadReportCsv("exhumaciones")}
                        disabled={downloadingReport === "exhumaciones"}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingReport === "exhumaciones" ? "Generando..." : "Descargar CSV"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Report 5 */}
                  <div
                    className="p-5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <HardHat className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                          Obras Particulares
                        </span>
                      </div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        Registro de Maestros & Derechos de Obra
                      </h4>
                      <p className="text-xs opacity-70 leading-relaxed">
                        Control de contratistas autorizados, órdenes de trabajo, sepulturas intervenidas y aranceles cancelados.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                      <span className="text-[11px] opacity-60">Control de faenas</span>
                      <button
                        type="button"
                        id="btn-export-maestros-admin"
                        onClick={() => handleDownloadReportCsv("maestros")}
                        disabled={downloadingReport === "maestros"}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingReport === "maestros" ? "Generando..." : "Descargar CSV"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 6: Direct Link */}
                  <div
                    className="p-5 rounded-xl border border-dashed flex flex-col justify-between transition-all hover:border-primary"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                  >
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        Módulo Completo de Reportes
                      </h4>
                      <p className="text-xs opacity-70 leading-relaxed">
                        Acceda a la visualización de datos en vivo, paginación, búsqueda instantánea por RUT o nombre, y formato imprimible oficial.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                      <Link
                        href="/reportes"
                        className="flex items-center space-x-1 text-xs font-bold text-primary hover:underline"
                      >
                        <span>Ir a la página de Reportes</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* RBAC Notice Card */}
              <div
                className="p-6 rounded-2xl border bg-blue-50/50 dark:bg-blue-950/20"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        Seguridad & Control de Acceso por Grupo (RBAC)
                      </h4>
                      <p className="text-xs opacity-75 mt-0.5 leading-relaxed">
                        El acceso al módulo de Reportes está protegido. Los administradores pueden otorgar o restringir el permiso <strong className="font-mono">REPORTES</strong> (Lectura / Escritura / Sin Acceso) a cualquier grupo de funcionarios desde la pestaña de Grupos.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("grupos")}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:bg-blue-500/10 shrink-0"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}
                  >
                    <span>Configurar Permisos de Grupo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACTIVIDAD DE USUARIOS (LOG FORENSE & MOVIMIENTOS) */}
          {activeTab === "actividad" && (
            <div className="space-y-6">
              {/* Executive Header Card */}
              <div
                className="p-6 rounded-2xl border shadow-sm relative overflow-hidden"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Log Forense de Actividad</span>
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        Solo Administrador
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Ley 21.719
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        Trazabilidad IP & Sesión
                      </span>
                    </div>

                    <h3 className="text-xl font-black tracking-tight" style={{ color: "var(--color-text)" }}>
                      Supervisión Forense y Registro de Movimientos de Usuarios
                    </h3>
                    <p className="text-xs opacity-75 leading-relaxed">
                      Auditoría integral en tiempo real de cada interacción dentro del sistema para los Cementerios de San Carlos y Cachapoal. Registra con exactitud la dirección IP de origen, el funcionario responsable, la ruta invocada, el método HTTP y el tiempo de respuesta.
                    </p>
                  </div>

                  {/* Actions: Export CSV, Refresh, Auto-Refresh */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      id="btn-export-activity-csv"
                      onClick={handleExportActivityCsv}
                      disabled={exportingActivityCsv || activityTotal === 0}
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      title="Exportar archivo CSV con codificación UTF-8 con BOM para Microsoft Excel"
                    >
                      {exportingActivityCsv ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Exportar CSV Excel</span>
                    </button>

                    <button
                      type="button"
                      id="btn-toggle-activity-autorefresh"
                      onClick={() => setActivityAutoRefresh(!activityAutoRefresh)}
                      className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                        activityAutoRefresh
                          ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50 shadow-sm"
                          : "border-gray-200 dark:border-gray-800 opacity-70 hover:opacity-100"
                      }`}
                      style={{ borderColor: activityAutoRefresh ? undefined : "var(--color-border)" }}
                      title="Actualización automática en vivo cada 10 segundos"
                    >
                      <Radio className={`w-3.5 h-3.5 ${activityAutoRefresh ? "animate-pulse text-purple-500" : ""}`} />
                      <span>{activityAutoRefresh ? "En Vivo (10s)" : "Auto (10s)"}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-refresh-activity"
                      onClick={() => fetchActivityLogs()}
                      disabled={loadingActivity}
                      className="p-2.5 rounded-xl border hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shrink-0"
                      style={{ borderColor: "var(--color-border)" }}
                      title="Actualizar registro ahora"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingActivity ? "animate-spin text-purple-500" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* KPIs Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div
                  className="p-4 rounded-xl border shadow-sm transition-all hover:border-purple-500/40"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Movimientos</span>
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black mt-2 text-purple-600 dark:text-purple-400">
                    {activityResumen.total_movimientos.toLocaleString("es-CL")}
                  </div>
                  <div className="text-[10px] opacity-50 mt-0.5">Operaciones totales</div>
                </div>

                <div
                  className="p-4 rounded-xl border shadow-sm transition-all hover:border-blue-500/40"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Usuarios</span>
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black mt-2 text-blue-600 dark:text-blue-400">
                    {activityResumen.usuarios_unicos}
                  </div>
                  <div className="text-[10px] opacity-50 mt-0.5">Cuentas activas</div>
                </div>

                <div
                  className="p-4 rounded-xl border shadow-sm transition-all hover:border-cyan-500/40"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">IPs Únicas</span>
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black mt-2 text-cyan-600 dark:text-cyan-400">
                    {activityResumen.ips_unicas}
                  </div>
                  <div className="text-[10px] opacity-50 mt-0.5">Orígenes de red</div>
                </div>

                <div
                  className="p-4 rounded-xl border shadow-sm transition-all hover:border-amber-500/40"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Modificaciones</span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black mt-2 text-amber-600 dark:text-amber-400">
                    {activityResumen.modificaciones_count}
                  </div>
                  <div className="text-[10px] opacity-50 mt-0.5">POST / PUT / DELETE</div>
                </div>

                <div
                  className="p-4 rounded-xl border shadow-sm transition-all hover:border-emerald-500/40"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Consultas</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
                    {activityResumen.lecturas_count}
                  </div>
                  <div className="text-[10px] opacity-50 mt-0.5">Lecturas GET</div>
                </div>

                <div
                  className="p-4 rounded-xl border shadow-sm transition-all hover:border-rose-500/40"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Rechazos / 4xx</span>
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black mt-2 text-rose-600 dark:text-rose-400">
                    {activityResumen.errores_count}
                  </div>
                  <div className="text-[10px] opacity-50 mt-0.5">Bloqueados / Fallos</div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div
                className="p-5 rounded-2xl border shadow-sm space-y-3"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider opacity-70">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filtros Dinámicos de Actividad</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Search box */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-40" />
                    <input
                      id="input-search-activity"
                      type="text"
                      placeholder="Buscar usuario, IP, ruta..."
                      value={activitySearch}
                      onChange={(e) => {
                        setActivitySearch(e.target.value);
                        setActivityPage(0);
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 font-sans"
                      style={{
                        backgroundColor: "var(--color-bg)",
                        borderColor: "var(--color-border)",
                      }}
                    />
                  </div>

                  {/* Module select */}
                  <select
                    id="select-activity-module"
                    value={activityModule}
                    onChange={(e) => {
                      setActivityModule(e.target.value);
                      setActivityPage(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 font-sans font-medium"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <option value="todos">Todos los Módulos</option>
                    <option value="INHUMACIONES">Inhumaciones & Defunciones</option>
                    <option value="UBICACIONES">Ubicaciones & Catastro GIS</option>
                    <option value="DERECHOS">Concesiones & Arriendos</option>
                    <option value="RESERVAS">Reservas de Sepulturas</option>
                    <option value="REPORTES">Reportes & Estadísticas (DS 357)</option>
                    <option value="AUTENTICACION">Autenticación & Login</option>
                    <option value="USUARIOS">Usuarios & Credenciales</option>
                    <option value="GRUPOS_PERMISOS">Grupos & Permisos (RBAC)</option>
                    <option value="EXHUMACIONES">Exhumaciones & Traslados</option>
                    <option value="MAESTROS">Obras & Maestros</option>
                    <option value="CAMPO_TERRENO">Faenas de Terreno</option>
                    <option value="CERTIFICADOS">Certificados Oficiales</option>
                    <option value="PORTAL_PUBLICO">Portal Ciudadano</option>
                    <option value="AUDITORIA">Auditoría HMAC</option>
                    <option value="TEMAS">Temas & Apariencia</option>
                    <option value="SISTEMA">Sistema General</option>
                  </select>

                  {/* Method select */}
                  <select
                    id="select-activity-method"
                    value={activityMethod}
                    onChange={(e) => {
                      setActivityMethod(e.target.value);
                      setActivityPage(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 font-sans font-medium"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <option value="todos">Todos los Métodos</option>
                    <option value="GET">GET — Lectura / Consulta</option>
                    <option value="POST">POST — Creación / Envío</option>
                    <option value="PUT">PUT — Actualización</option>
                    <option value="PATCH">PATCH — Modificación Parcial</option>
                    <option value="DELETE">DELETE — Eliminación</option>
                  </select>

                  {/* Status select */}
                  <select
                    id="select-activity-status"
                    value={activityStatus}
                    onChange={(e) => {
                      setActivityStatus(e.target.value);
                      setActivityPage(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 font-sans font-medium"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <option value="todos">Todos los Estados HTTP</option>
                    <option value="exito">Exitosos (200 - 399)</option>
                    <option value="error">Errores & Denegados (400 - 599)</option>
                  </select>

                  {/* Date range select */}
                  <select
                    id="select-activity-date"
                    value={activityDateRange}
                    onChange={(e) => {
                      setActivityDateRange(e.target.value);
                      setActivityPage(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 font-sans font-medium"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <option value="todos">Todo el Historial</option>
                    <option value="hoy">Hoy</option>
                    <option value="7dias">Últimos 7 días</option>
                    <option value="30dias">Últimos 30 días</option>
                  </select>
                </div>
              </div>

              {/* Activity Log Data Table */}
              <div
                className="rounded-2xl border shadow-sm overflow-hidden"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}>
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] opacity-70">Fecha / Hora</th>
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] opacity-70">Usuario</th>
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] opacity-70">IP de Origen</th>
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] opacity-70">Movimiento</th>
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] opacity-70">Descripción de Actividad</th>
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] opacity-70 text-center">Estado</th>
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] opacity-70 text-right">Latencia</th>
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] opacity-70 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                      {loadingActivity ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center opacity-60">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                              <span className="text-xs font-medium">Cargando registros de actividad...</span>
                            </div>
                          </td>
                        </tr>
                      ) : activityLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center opacity-60">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <Activity className="w-8 h-8 opacity-30" />
                              <span className="text-xs font-semibold">No se encontraron movimientos registrados con los filtros seleccionados</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActivitySearch("");
                                  setActivityModule("todos");
                                  setActivityMethod("todos");
                                  setActivityStatus("todos");
                                  setActivityDateRange("todos");
                                }}
                                className="text-xs text-purple-600 underline font-bold mt-1"
                              >
                                Limpiar filtros
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        activityLogs.map((log) => {
                          const dateObj = new Date(log.timestamp);
                          const dateStr = dateObj.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
                          const timeStr = dateObj.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                          // Method Badge
                          const methodColors: Record<string, string> = {
                            GET: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
                            POST: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                            PUT: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                            PATCH: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                            DELETE: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
                          };

                          // Status Badge
                          const isSuccess = log.status_code >= 200 && log.status_code < 400;
                          const isDenied = log.status_code === 401 || log.status_code === 403;

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                            >
                              {/* Timestamp */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-mono font-bold text-xs" style={{ color: "var(--color-text)" }}>
                                  {timeStr}
                                </div>
                                <div className="text-[11px] opacity-60">{dateStr}</div>
                              </td>

                              {/* User */}
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-7 h-7 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                                    {(log.username || "A").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold flex items-center space-x-1.5" style={{ color: "var(--color-text)" }}>
                                      <span>{log.username}</span>
                                      {log.user_role === "ADMINISTRADOR" && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30">
                                          Admin
                                        </span>
                                      )}
                                    </div>
                                    {log.user_rut && (
                                      <div className="text-[10px] font-mono opacity-60">{log.user_rut}</div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* IP Address */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border" style={{ borderColor: "var(--color-border)" }}>
                                    {log.ip_address}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(log.ip_address);
                                      setCopiedIp(log.ip_address);
                                      setTimeout(() => setCopiedIp(null), 2000);
                                    }}
                                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-xs opacity-60 hover:opacity-100 transition-opacity"
                                    title="Copiar IP"
                                  >
                                    {copiedIp === log.ip_address ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Movement & Module */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${
                                      methodColors[log.metodo] || "bg-slate-500/10 text-slate-700 border-slate-500/30"
                                    }`}
                                  >
                                    {log.metodo}
                                  </span>
                                  <span className="text-xs font-bold opacity-80">{log.modulo}</span>
                                </div>
                              </td>

                              {/* Description */}
                              <td className="py-3 px-4 max-w-xs md:max-w-md">
                                <div className="font-semibold text-xs leading-snug" style={{ color: "var(--color-text)" }}>
                                  {log.descripcion}
                                </div>
                                <div className="text-[10px] font-mono opacity-50 truncate mt-0.5">
                                  {log.ruta}
                                </div>
                              </td>

                              {/* HTTP Status */}
                              <td className="py-3 px-4 whitespace-nowrap text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                    isSuccess
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                      : isDenied
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  }`}
                                >
                                  {log.status_code}
                                </span>
                              </td>

                              {/* Latency */}
                              <td className="py-3 px-4 whitespace-nowrap text-right font-mono text-[11px] opacity-75">
                                {log.duracion_ms ? `${log.duracion_ms} ms` : "—"}
                              </td>

                              {/* Detail button */}
                              <td className="py-3 px-4 whitespace-nowrap text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedActivityDetail(log)}
                                  className="p-1.5 rounded-lg border hover:bg-purple-500/10 hover:text-purple-600 transition-colors"
                                  style={{ borderColor: "var(--color-border)" }}
                                  title="Ver detalles completos del movimiento"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div
                  className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-3"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}
                >
                  <div className="text-xs opacity-70">
                    Mostrando{" "}
                    <span className="font-bold">
                      {activityTotal > 0 ? activityPage * activityLimit + 1 : 0}
                    </span>{" "}
                    a{" "}
                    <span className="font-bold">
                      {Math.min((activityPage + 1) * activityLimit, activityTotal)}
                    </span>{" "}
                    de <span className="font-bold">{activityTotal}</span> movimientos
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={activityLimit}
                      onChange={(e) => {
                        setActivityLimit(Number(e.target.value));
                        setActivityPage(0);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border text-xs outline-none font-semibold"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <option value={25}>25 por página</option>
                      <option value={50}>50 por página</option>
                      <option value={100}>100 por página</option>
                    </select>

                    <button
                      type="button"
                      disabled={activityPage === 0}
                      onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                      className="px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      Anterior
                    </button>
                    <span className="text-xs font-bold px-2">
                      Página {activityPage + 1} de {Math.max(1, Math.ceil(activityTotal / activityLimit))}
                    </span>
                    <button
                      type="button"
                      disabled={(activityPage + 1) * activityLimit >= activityTotal}
                      onClick={() => setActivityPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear Nuevo Funcionario */}
      {showCreateModal && (
        <div 
          id="modal-create-user-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="modal-create-user-dialog"
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">Registrar Nuevo Funcionario</h3>
              </div>
              <button
                id="btn-close-create-user"
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-bold p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mariela Sepúlveda Riquelme"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    Nombre de Usuario (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: msepulveda"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold opacity-80">
                      RUT Chileno (con DV) *
                    </label>
                    <button
                      type="button"
                      onClick={suggestValidRut}
                      className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Sugerir Válido
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="12345678-5"
                    value={formRut}
                    onChange={(e) => setFormRut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  Correo Institucional (@munisancarlos.cl)
                </label>
                <input
                  type="email"
                  placeholder="msepulveda@munisancarlos.cl"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                />
              </div>

              {/* Grupo Funcional Selector */}
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  Grupo Funcional de Permisos (RBAC)
                </label>
                <select
                  value={formGrupoId}
                  onChange={(e) => setFormGrupoId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-semibold text-xs"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <option value="">-- Sin Grupo (Hereda permisos de Rol Base) --</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre} {g.es_sistema ? "(Predefinido)" : "(Personalizado)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  Rol Base Institucional *
                </label>
                <select
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-semibold text-xs"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <option value="ADMINISTRATIVO">ADMINISTRATIVO — Operación municipal estándar</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR — Control total, configuración y auditoría</option>
                  <option value="VISITA">VISITA — Consulta ciudadana (causa de defunción anonimizada)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-semibold opacity-80">
                      Contraseña Inicial *
                    </label>
                    <button
                      type="button"
                      onClick={suggestSecurePassword}
                      className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Sugerir Segura
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-primary flex items-center space-x-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono text-xs focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                />

                {/* Password Policy Indicators */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border text-[11px] space-y-1" style={{ borderColor: "var(--color-border)" }}>
                  <div className="font-bold opacity-75">Política de Seguridad Ley 21.719 / ASVS Nivel 2:</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className={pwLength ? "text-emerald-600 font-bold" : "opacity-50"}>
                      {pwLength ? "✓" : "○"} Mínimo 12 caracteres ({formPassword.length}/12)
                    </span>
                    <span className={pwUpper ? "text-emerald-600 font-bold" : "opacity-50"}>
                      {pwUpper ? "✓" : "○"} Al menos una Mayúscula
                    </span>
                    <span className={pwLower ? "text-emerald-600 font-bold" : "opacity-50"}>
                      {pwLower ? "✓" : "○"} Al menos una Minúscula
                    </span>
                    <span className={pwDigit ? "text-emerald-600 font-bold" : "opacity-50"}>
                      {pwDigit ? "✓" : "○"} Al menos un Número
                    </span>
                    <span className={pwSpecial ? "text-emerald-600 font-bold" : "opacity-50"}>
                      {pwSpecial ? "✓" : "○"} Al menos un Símbolo (!@#$%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  id="btn-cancel-create-user"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !isPasswordValid}
                  className="px-5 py-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow transition-all disabled:opacity-50"
                >
                  {createLoading ? "Registrando..." : "Guardar Funcionario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Grupo y Matriz de Permisos */}
      {showGroupModal && (
        <div 
          id="modal-create-group-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowGroupModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="modal-create-group-dialog"
            className="w-full max-w-3xl rounded-2xl border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-lg sm:text-xl font-black">
                    {editingGroupId ? "Editar Grupo y Matriz de Permisos" : "Crear Nuevo Grupo de Acceso (RBAC)"}
                  </h3>
                  <p className="text-xs opacity-70">
                    Defina permisos a nivel de módulo: Sin Acceso, Solo Lectura o Lectura y Escritura.
                  </p>
                </div>
              </div>
              <button
                id="btn-close-create-group"
                onClick={() => setShowGroupModal(false)}
                className="text-xs font-bold p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {groupError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{groupError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGroup} className="space-y-6">
              {/* Group Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    Nombre del Grupo *
                  </label>
                  <input
                    type="text"
                    id="input-group-nombre"
                    required
                    placeholder="Ej: Fiscalizadores de Obras y Terreno"
                    value={groupNombre}
                    onChange={(e) => setGroupNombre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    Descripción / Propósito Funcional
                  </label>
                  <input
                    type="text"
                    id="input-group-desc"
                    placeholder="Ej: Cuadrillas autorizadas para registrar obras y exhumaciones"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border flex flex-wrap items-center justify-between gap-2" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                  Plantillas Rápidas:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset("read_all")}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-white dark:bg-slate-800 hover:border-primary transition-all"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    🔍 Solo Lectura en Todo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("write_ops")}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-white dark:bg-slate-800 hover:border-primary transition-all"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    👷 Operativo Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("admin_all")}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-white dark:bg-slate-800 hover:border-primary transition-all"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    ⚡ Acceso Total (Write)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("clear")}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border text-red-600 bg-white dark:bg-slate-800 hover:border-red-400 transition-all"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    ✕ Limpiar (Sin Acceso)
                  </button>
                </div>
              </div>

              {/* Granular Permission Matrix Table */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Configuración Granular de Permisos por Módulo:
                </div>

                <div className="rounded-xl border divide-y overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
                  {ALL_MODULES.map((mod) => {
                    const info = MODULE_INFO[mod];
                    const Icon = info?.icon || Shield;
                    const currentVal = groupPermisos[mod] || "NONE";

                    return (
                      <div
                        key={mod}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        style={{ backgroundColor: "var(--color-surface)" }}
                      >
                        <div className="flex items-start space-x-3">
                          <div 
                            className="p-2 rounded-lg text-primary mt-0.5"
                            style={{ backgroundColor: "var(--color-bg)" }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm leading-tight">
                              {info?.label || mod}
                            </div>
                            <div className="text-xs opacity-70 mt-0.5">
                              {info?.desc}
                            </div>
                          </div>
                        </div>

                        {/* 3-State Segmented Control */}
                        <div className="flex items-center rounded-xl border p-1 bg-slate-100 dark:bg-slate-900 shrink-0 self-end sm:self-center" style={{ borderColor: "var(--color-border)" }}>
                          <button
                            type="button"
                            onClick={() => setGroupPermisos({ ...groupPermisos, [mod]: "NONE" })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentVal === "NONE"
                                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                          >
                            Sin Acceso
                          </button>
                          <button
                            type="button"
                            onClick={() => setGroupPermisos({ ...groupPermisos, [mod]: "READ" })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentVal === "READ"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                            }`}
                          >
                            Solo Lectura
                          </button>
                          <button
                            type="button"
                            onClick={() => setGroupPermisos({ ...groupPermisos, [mod]: "WRITE" })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentVal === "WRITE"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                            }`}
                          >
                            Lectura & Escritura
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  id="btn-cancel-create-group"
                  onClick={() => setShowGroupModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-group"
                  disabled={groupSaving}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow transition-all disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {groupSaving ? "Guardando Grupo..." : editingGroupId ? "Guardar Modificaciones" : "Crear Grupo Municipal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Asignar Usuario a Grupo */}
      {showAssignModal && selectedUserForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-5"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold">Asignar Grupo Funcional</h3>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-xs font-bold p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs space-y-1" style={{ borderColor: "var(--color-border)" }}>
              <div className="font-bold text-sm">{selectedUserForAssign.nombre_completo}</div>
              <div className="opacity-75">
                Usuario: <code className="font-mono text-primary font-bold">{selectedUserForAssign.username}</code> • RUT: {selectedUserForAssign.rut || "—"}
              </div>
              <div className="opacity-75">
                Grupo Actual: <span className="font-bold">{selectedUserForAssign.grupo_nombre || "Sin Grupo"}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold opacity-80">
                Seleccione el nuevo Grupo Municipal:
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {grupos.map((g) => {
                  const isSelected = selectedTargetGroupId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedTargetGroupId(g.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected 
                          ? "border-primary bg-primary/5 font-bold" 
                          : "hover:border-primary/50"
                      }`}
                      style={{ borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)" }}
                    >
                      <div>
                        <div className="text-xs font-bold">{g.nombre}</div>
                        <div className="text-[11px] opacity-70 line-clamp-1">{g.descripcion}</div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                style={{ borderColor: "var(--color-border)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssignUserToGroup}
                disabled={assignLoading || selectedTargetGroupId === ""}
                className="px-5 py-2 rounded-xl font-bold text-xs text-white shadow transition-all disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {assignLoading ? "Asignando..." : "Confirmar Asignación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Funcionario */}
      {showEditModal && selectedUserForEdit && (
        <div 
          id="modal-edit-user-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="modal-edit-user-dialog"
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">Editar Funcionario Municipal</h3>
              </div>
              <button
                id="btn-close-edit-user"
                onClick={() => setShowEditModal(false)}
                className="text-xs font-bold p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <span className="opacity-70">Nombre de Usuario (inmutable):</span>{" "}
                  <code className="font-mono font-bold text-primary">{selectedUserForEdit.username}</code>
                </div>
                <div className="text-[11px] opacity-60">ID #{selectedUserForEdit.id}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  Nombre Completo *
                </label>
                <input
                  id="input-edit-nombre"
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    Correo Institucional
                  </label>
                  <input
                    id="input-edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    RUT Chileno (con DV)
                  </label>
                  <input
                    id="input-edit-rut"
                    type="text"
                    value={editRut}
                    onChange={(e) => setEditRut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    Rol del Sistema *
                  </label>
                  <select
                    id="select-edit-rol"
                    value={editRol}
                    onChange={(e) => setEditRol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <option value="ADMINISTRATIVO">Administrativo</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="VISITA">Visita / Consulta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-80">
                    Grupo Funcional (RBAC)
                  </label>
                  <select
                    id="select-edit-grupo"
                    value={editGrupoId}
                    onChange={(e) => setEditGrupoId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <option value="">(Sin Grupo Asignado)</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    id="checkbox-edit-activo"
                    type="checkbox"
                    checked={editActivo}
                    onChange={(e) => setEditActivo(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <span className="text-xs font-bold">Cuenta de Funcionario Activa</span>
                    <p className="text-[11px] opacity-60">Si se desmarca, el usuario no podrá iniciar sesión en la plataforma.</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  id="btn-cancel-edit-user"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-edit-user"
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {editLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editLoading ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Contraseña de Funcionario */}
      {showPasswordModal && selectedUserForPassword && (
        <div 
          id="modal-password-user-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="modal-password-user-dialog"
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-5"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold">Cambiar Contraseña</h3>
              </div>
              <button
                id="btn-close-password-user"
                onClick={() => setShowPasswordModal(false)}
                className="text-xs font-bold p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs space-y-1" style={{ borderColor: "var(--color-border)" }}>
              <div className="font-bold text-sm">{selectedUserForPassword.nombre_completo}</div>
              <div className="opacity-75">
                Usuario: <code className="font-mono text-primary font-bold">{selectedUserForPassword.username}</code> • Rol: {selectedUserForPassword.rol}
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleAdminChangePassword} className="space-y-4 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold opacity-80">
                    Nueva Contraseña *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-[11px] text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showNewPassword ? "Ocultar" : "Mostrar"}</span>
                  </button>
                </div>
                <input
                  id="input-new-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={12}
                  placeholder="Mínimo 12 caracteres (ej: ClaveSegura2026!)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                />
                <p className="text-[11px] opacity-60 mt-1">
                  Requisito Ley 21.719 y ASVS L2: Al menos 12 caracteres alfanuméricos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-80">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  id="input-confirm-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={12}
                  placeholder="Repita la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  id="btn-cancel-password-user"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-change-password"
                  type="submit"
                  disabled={passwordLoading || !newPassword}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow bg-amber-600 hover:bg-amber-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {passwordLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{passwordLoading ? "Actualizando..." : "Actualizar Contraseña"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Movimiento de Usuario */}
      {selectedActivityDetail && (
        <div
          id="modal-activity-detail-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedActivityDetail(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="modal-activity-detail-dialog"
            className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                    Detalle Forense del Movimiento #{selectedActivityDetail.id}
                  </h3>
                  <p className="text-xs opacity-60">
                    Registro de auditoría conforme a Ley 21.719
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivityDetail(null)}
                className="p-1.5 rounded-xl border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                style={{ borderColor: "var(--color-border)" }}
              >
                ✕
              </button>
            </div>

            {/* Grid of detail fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/50" style={{ borderColor: "var(--color-border)" }}>
                <span className="font-semibold opacity-60 uppercase text-[10px] block">Fecha y Hora Exacta</span>
                <span className="font-mono font-bold text-sm block mt-0.5">
                  {new Date(selectedActivityDetail.timestamp).toLocaleString("es-CL", { timeZone: "America/Santiago" })}
                </span>
                <span className="text-[10px] opacity-50 font-mono">{selectedActivityDetail.timestamp}</span>
              </div>

              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/50" style={{ borderColor: "var(--color-border)" }}>
                <span className="font-semibold opacity-60 uppercase text-[10px] block">Usuario / Funcionario</span>
                <span className="font-bold text-sm block mt-0.5 text-purple-600 dark:text-purple-400">
                  {selectedActivityDetail.username}
                </span>
                <span className="text-[10px] opacity-60 block">
                  RUT: {selectedActivityDetail.user_rut || "N/A"} | Rol: {selectedActivityDetail.user_role || "Sin rol"}
                </span>
              </div>

              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/50" style={{ borderColor: "var(--color-border)" }}>
                <span className="font-semibold opacity-60 uppercase text-[10px] block">Dirección IP de Origen</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="font-mono font-bold text-sm">{selectedActivityDetail.ip_address}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedActivityDetail.ip_address);
                      setCopiedIp(selectedActivityDetail.ip_address);
                      setTimeout(() => setCopiedIp(null), 2000);
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
                    title="Copiar IP"
                  >
                    {copiedIp === selectedActivityDetail.ip_address ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/50" style={{ borderColor: "var(--color-border)" }}>
                <span className="font-semibold opacity-60 uppercase text-[10px] block">Resultado HTTP & Latencia</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-black border ${
                    selectedActivityDetail.status_code < 400
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                  }`}>
                    HTTP {selectedActivityDetail.status_code}
                  </span>
                  <span className="font-mono text-xs opacity-75">
                    {selectedActivityDetail.duracion_ms ? `${selectedActivityDetail.duracion_ms} ms` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Movement description & Endpoint */}
            <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900/50 space-y-1.5" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold opacity-60 uppercase text-[10px]">Descripción del Movimiento</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">
                  {selectedActivityDetail.modulo} / {selectedActivityDetail.accion}
                </span>
              </div>
              <p className="font-bold text-xs" style={{ color: "var(--color-text)" }}>
                {selectedActivityDetail.descripcion}
              </p>
              <div className="font-mono text-[11px] p-2 rounded bg-black/10 dark:bg-black/30 break-all">
                <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">{selectedActivityDetail.metodo}</span>
                {selectedActivityDetail.ruta}
              </div>
            </div>

            {/* User Agent */}
            {selectedActivityDetail.user_agent && (
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/50 space-y-1" style={{ borderColor: "var(--color-border)" }}>
                <span className="font-semibold opacity-60 uppercase text-[10px]">Navegador & Dispositivo (User-Agent)</span>
                <p className="font-mono text-[11px] opacity-80 break-all">
                  {selectedActivityDetail.user_agent}
                </p>
              </div>
            )}

            {/* JSON Details */}
            {selectedActivityDetail.detalles && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold opacity-60 uppercase text-[10px]">Parámetros & Carga Útil (Payload)</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedActivityDetail.detalles, null, 2));
                    }}
                    className="flex items-center space-x-1 text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar JSON</span>
                  </button>
                </div>
                <pre
                  className="p-3 rounded-xl border font-mono text-[11px] overflow-x-auto max-h-48"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  {JSON.stringify(selectedActivityDetail.detalles, null, 2)}
                </pre>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                onClick={() => setSelectedActivityDetail(null)}
                className="px-5 py-2 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
