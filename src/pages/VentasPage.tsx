import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VentaData {
  id: string;
  socio: string;
  fecha_venta: string;
  inventario: number;
  salidas_venta: number;
  salidas_muerte: number;
  salidas_robo: number;
  vr_kilo_venta: number;
  total_kilos_venta: number;
  total_venta: number;
  sesenta_porciento: number;
  cuarenta_porciento: number;
  inventario_actual: number;
}

export function VentasPage() {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState<VentaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSocio, setFiltroSocio] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [socios, setSocios] = useState<string[]>([]);

  useEffect(() => {
    fetchVentas();
    fetchSocios();
  }, []);

  const fetchSocios = async () => {
    try {
      const { data, error } = await supabase
        .from('registros')
        .select('socio')
        .order('socio');

      if (error) throw error;

      const sociosUnicos = [...new Set(data.map(item => item.socio))];
      setSocios(sociosUnicos);
    } catch (error) {
      console.error('Error fetching socios:', error);
    }
  };

  const fetchVentas = async () => {
    try {
      setLoading(true);

      // Obtener todas las salidas por ventas
      const { data: salidasVentas, error: salidasError } = await supabase
        .from('salidas_detalle')
        .select('*')
        .eq('causa', 'ventas')
        .order('fecha', { ascending: false });

      if (salidasError) throw salidasError;

      // Obtener todos los registros para calcular inventarios
      const { data: registros, error: registrosError } = await supabase
        .from('registros')
        .select('*')
        .order('fecha', { ascending: false });

      if (registrosError) throw registrosError;

      // Procesar datos de ventas
      const ventasProcessed: VentaData[] = [];

      for (const salida of salidasVentas || []) {
        // Calcular inventario total del socio (suma de todas las entradas)
        const inventarioTotal = registros
          .filter(r => r.socio === salida.socio)
          .reduce((sum, r) => sum + (r.entradas || 0), 0);

        // Calcular salidas por causa hasta la fecha de venta
        const salidasHastaFecha = await supabase
          .from('salidas_detalle')
          .select('*')
          .eq('socio', salida.socio)
          .lte('fecha', salida.fecha);

        const salidasData = salidasHastaFecha.data || [];
        
        const salidasVenta = salidasData
          .filter(s => s.causa === 'ventas')
          .reduce((sum, s) => sum + s.cantidad, 0);

        const salidasMuerte = salidasData
          .filter(s => s.causa === 'muerte')
          .reduce((sum, s) => sum + s.cantidad, 0);

        const salidasRobo = salidasData
          .filter(s => s.causa === 'robo')
          .reduce((sum, s) => sum + s.cantidad, 0);

        // Obtener datos del registro más reciente del socio para precios
        const registroReciente = registros
          .filter(r => r.socio === salida.socio)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

        const vrKiloVenta = registroReciente?.vr_kilo || 0;
        const kgTotales = registroReciente?.kg_totales || 0;
        
        // Calcular totales
        const totalKilosVenta = salida.cantidad * kgTotales;
        const totalVenta = totalKilosVenta * vrKiloVenta;
        const sesentaPorciento = totalVenta * 0.6;
        const cuarentaPorciento = totalVenta * 0.4;
        
        // Inventario actual
        const inventarioActual = inventarioTotal - salidasVenta - salidasMuerte - salidasRobo;

        ventasProcessed.push({
          id: salida.id,
          socio: salida.socio,
          fecha_venta: salida.fecha,
          inventario: inventarioTotal,
          salidas_venta: salidasVenta,
          salidas_muerte: salidasMuerte,
          salidas_robo: salidasRobo,
          vr_kilo_venta: vrKiloVenta,
          total_kilos_venta: totalKilosVenta,
          total_venta: totalVenta,
          sesenta_porciento: sesentaPorciento,
          cuarenta_porciento: cuarentaPorciento,
          inventario_actual: inventarioActual
        });
      }

      setVentas(ventasProcessed);
    } catch (error) {
      console.error('Error fetching ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const ventasFiltradas = ventas.filter(venta => {
    const cumpleSocio = !filtroSocio || venta.socio.toLowerCase().includes(filtroSocio.toLowerCase());
    const cumpleFecha = !filtroFecha || venta.fecha_venta.includes(filtroFecha);
    return cumpleSocio && cumpleFecha;
  });

  const exportarCSV = () => {
    const headers = [
      'Fecha Venta',
      'Socio',
      'Inventario',
      'Salidas x Venta',
      'Salidas x Muerte',
      'Salidas x Robo',
      'Vr Kilo Venta',
      'Total Kilos Venta',
      'Total Venta',
      '60%',
      '40%',
      'Inventario Actual'
    ];

    const csvContent = [
      headers.join(','),
      ...ventasFiltradas.map(venta => [
        venta.fecha_venta,
        venta.socio,
        venta.inventario,
        venta.salidas_venta,
        venta.salidas_muerte,
        venta.salidas_robo,
        venta.vr_kilo_venta.toFixed(2),
        venta.total_kilos_venta.toFixed(2),
        venta.total_venta.toFixed(2),
        venta.sesenta_porciento.toFixed(2),
        venta.cuarenta_porciento.toFixed(2),
        venta.inventario_actual
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ventas.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Reporte de Ventas</h1>
                <p className="text-gray-600">Gestión y seguimiento de ventas ganaderas</p>
              </div>
            </div>
            <button
              onClick={exportarCSV}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Socio
              </label>
              <select
                value={filtroSocio}
                onChange={(e) => setFiltroSocio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los socios</option>
                {socios.map(socio => (
                  <option key={socio} value={socio}>{socio}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Ventas */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Ventas Registradas ({ventasFiltradas.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inventario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salidas x Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salidas x Muerte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salidas x Robo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vr Kilo Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Kilos Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    60%
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    40%
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inventario Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Socio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventasFiltradas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(venta.fecha_venta).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.inventario}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.salidas_venta}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.salidas_muerte}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.salidas_robo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${venta.vr_kilo_venta.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.total_kilos_venta.toFixed(2)} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ${venta.total_venta.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${venta.sesenta_porciento.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${venta.cuarenta_porciento.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.inventario_actual}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {venta.socio}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ventasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron ventas registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}