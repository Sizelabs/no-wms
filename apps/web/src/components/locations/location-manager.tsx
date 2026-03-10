"use client";

import { MapPin, Plus, Grid3X3 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { BulkGenerator } from "@/components/locations/bulk-generator";
import { LocationForm } from "@/components/locations/location-form";
import { LocationTree } from "@/components/locations/location-tree";
import { ZoneForm } from "@/components/locations/zone-form";
import { ZoneList } from "@/components/locations/zone-list";
import { selectClass, secondaryBtnClass } from "@/components/ui/form-section";
import {
  getZonesForWarehouse,
  getLocationsForZone,
  deleteZone,
  deleteLocation,
} from "@/lib/actions/location-management";

// Types
interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface ResourcePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

// Zone type from server
export type Zone = Awaited<ReturnType<typeof getZonesForWarehouse>>[number];
export type Location = Awaited<ReturnType<typeof getLocationsForZone>>[number];

interface Props {
  warehouses: Warehouse[];
  permissions: ResourcePermissions;
}

export function LocationManager({ warehouses, permissions }: Props) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  const [showZoneForm, setShowZoneForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Fetch zones when warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) return;
    startTransition(async () => {
      const data = await getZonesForWarehouse(selectedWarehouseId);
      setZones(data);
      setSelectedZoneId(null);
      setLocations([]);
    });
  }, [selectedWarehouseId]);

  // Fetch locations when zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      setLocations([]);
      return;
    }
    startTransition(async () => {
      const data = await getLocationsForZone(selectedZoneId);
      setLocations(data);
    });
  }, [selectedZoneId]);

  const refreshZones = () => {
    if (!selectedWarehouseId) return;
    startTransition(async () => {
      const data = await getZonesForWarehouse(selectedWarehouseId);
      setZones(data);
    });
  };

  const refreshLocations = () => {
    if (!selectedZoneId) return;
    startTransition(async () => {
      const data = await getLocationsForZone(selectedZoneId);
      setLocations(data);
    });
  };

  const handleDeleteZone = (zoneId: string) => {
    startTransition(async () => {
      const result = await deleteZone(zoneId);
      if (result.error) {
        notify(result.error, "error");
        return;
      }
      notify("Zona eliminada", "success");
      if (selectedZoneId === zoneId) {
        setSelectedZoneId(null);
        setLocations([]);
      }
      refreshZones();
    });
  };

  const handleDeleteLocation = (locationId: string) => {
    startTransition(async () => {
      const result = await deleteLocation(locationId);
      if (result.error) {
        notify(result.error, "error");
        return;
      }
      notify("Ubicación eliminada", "success");
      refreshLocations();
      refreshZones(); // update location count
    });
  };

  const handleZoneFormDone = () => {
    setShowZoneForm(false);
    setEditingZone(null);
    refreshZones();
  };

  const handleLocationFormDone = () => {
    setShowLocationForm(false);
    setEditingLocation(null);
    refreshLocations();
    refreshZones();
  };

  const handleBulkDone = () => {
    setShowBulkGenerator(false);
    refreshLocations();
    refreshZones();
  };

  if (warehouses.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <MapPin className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-sm text-gray-500">No hay bodegas disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warehouse selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Bodega:</label>
        <select
          className={selectClass + " max-w-xs"}
          value={selectedWarehouseId}
          onChange={(e) => setSelectedWarehouseId(e.target.value)}
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Zone list (left panel) */}
        <div className="rounded-xl border border-gray-200 bg-white lg:col-span-1">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Zonas</h3>
            {permissions.create && (
              <button
                className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
                onClick={() => {
                  setEditingZone(null);
                  setShowZoneForm(true);
                }}
              >
                <Plus className="h-3 w-3" />
                Zona
              </button>
            )}
          </div>
          <ZoneList
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelect={setSelectedZoneId}
            onEdit={(zone) => {
              setEditingZone(zone);
              setShowZoneForm(true);
            }}
            onDelete={handleDeleteZone}
            canEdit={permissions.update}
            canDelete={permissions.delete}
            isPending={isPending}
          />
        </div>

        {/* Location list (right panel) */}
        <div className="rounded-xl border border-gray-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedZone ? `Ubicaciones — ${selectedZone.name}` : "Ubicaciones"}
            </h3>
            {selectedZoneId && permissions.create && (
              <div className="flex items-center gap-2">
                {selectedZone?.zone_type === "storage" && (
                  <button
                    className={secondaryBtnClass + " !px-3 !py-1.5 !text-xs flex items-center gap-1"}
                    onClick={() => setShowBulkGenerator(true)}
                  >
                    <Grid3X3 className="h-3 w-3" />
                    Generar
                  </button>
                )}
                <button
                  className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
                  onClick={() => {
                    setEditingLocation(null);
                    setShowLocationForm(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Ubicación
                </button>
              </div>
            )}
          </div>
          <LocationTree
            locations={locations}
            selectedZone={selectedZone ?? null}
            onEdit={(location) => {
              setEditingLocation(location);
              setShowLocationForm(true);
            }}
            onDelete={handleDeleteLocation}
            canEdit={permissions.update}
            canDelete={permissions.delete}
            isPending={isPending}
          />
        </div>
      </div>

      {/* Zone form modal */}
      {showZoneForm && (
        <ZoneForm
          zone={editingZone}
          warehouseId={selectedWarehouseId}
          onDone={handleZoneFormDone}
          onCancel={() => {
            setShowZoneForm(false);
            setEditingZone(null);
          }}
        />
      )}

      {/* Location form modal */}
      {showLocationForm && selectedZoneId && (
        <LocationForm
          location={editingLocation}
          zoneId={selectedZoneId}
          onDone={handleLocationFormDone}
          onCancel={() => {
            setShowLocationForm(false);
            setEditingLocation(null);
          }}
        />
      )}

      {/* Bulk generator modal */}
      {showBulkGenerator && selectedZoneId && (
        <BulkGenerator
          zoneId={selectedZoneId}
          onDone={handleBulkDone}
          onCancel={() => setShowBulkGenerator(false)}
        />
      )}
    </div>
  );
}
