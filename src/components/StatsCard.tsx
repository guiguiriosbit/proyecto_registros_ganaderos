@@ .. @@
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
+import { useNavigate } from 'react-router-dom';

interface StatsCardProps {
@@ .. @@
}

export function StatsCard({ title, value, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
+  const navigate = useNavigate();
+
+  const handleVentasClick = () => {
+    navigate('/ventas');
+  };
+
   const colorClasses = {
@@ .. @@
         <div className="flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-gray-600">{title}</p>
             <p className="text-2xl font-bold text-gray-900">{value}</p>
+            {title === 'Total Registros' && (
+              <button
+                onClick={handleVentasClick}
+                className="mt-2 px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
+              >
+                Ventas
+              </button>
+            )}
           </div>
           <div className={`p-3 rounded-full ${colorClasses[color]}`}>
             <Icon className="h-6 w-6 text-white" />
           </div>
         </div>
         {trend && (
           <div className="mt-4 flex items-center">
             {trend > 0 ? (
               <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
             ) : (
               <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
             )}
             <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
               {Math.abs(trend)}%
             </span>
             <span className="text-sm text-gray-500 ml-1">vs mes anterior</span>
           </div>
         )}
       </div>
     </div>
   );
 }