// Types for Hover API v3 responses

export interface HoverAddress {
  location_line_1: string;
  location_line_2: string | null;
  city: string;
  region: string;
  postal_code: string;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
}

export interface HoverCustomer {
  first_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface HoverArtifacts {
  measurements: {
    pdf: string;
    json: string;
    summarized_json?: string;
    full_json?: string;
    xlsx: string;
  };
  cad_exports: {
    skp: string;
    dwg: string;
    dxf: string;
    xml: string;
    xml_v2: string;
  };
}

export interface HoverModel {
  id: number;
  name: string | null;
  state: 'complete' | 'failed' | 'uploading' | 'processing';
  deliverable: string;
  capture_id: number | null;
  artifacts: HoverArtifacts;
  images: { id: number; url: string; created_at: string }[];
  created_at: string;
  updated_at: string;
}

export interface HoverJob {
  id: number;
  name: string;
  reconstruction_state: string;
  external_identifier: string | null;
  address: HoverAddress;
  customer: HoverCustomer;
  models: HoverModel[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface HoverJobListResponse {
  results: HoverJob[];
  pagination: {
    current_page: number;
    next_page: number | null;
  };
}

// Measurement JSON types (from full_json version)

export interface HoverWindow {
  opening: string;          // "W-101"
  width_x_height: string;   // "40\" x 18\""
  united_inches: string;    // "59\""
  area: number;
}

export interface HoverDoor {
  opening: string;           // "D-1"
  width_x_height: string;
  area: number;
}

export interface HoverWindowGroup {
  name: string;              // "WG-1"
  width: number;             // precise float in inches
  height: number;            // precise float in inches
  united_inches: number;
  windows: string[];         // ["W-101", "W-102"]
}

export interface HoverFacade {
  facade: string;            // "STC-1", "BR-1"
  area: number;
  shutters: number;
  vents: number;
  labeled_on_screenshot: boolean;
  openings: {
    openings_total: number;
  };
}

export interface HoverMeasurements {
  version?: number;
  summary: {
    address: string;
    property_id: number;
    [key: string]: unknown;
  };
  openings: {
    windows: HoverWindow[];
    doors: HoverDoor[];
    window_groups: HoverWindowGroup[];
  };
  facades: {
    [materialType: string]: HoverFacade[];
  };
  [key: string]: unknown;
}

// Parsed window data for the import UI
export interface ParsedHoverWindow {
  label: string;           // "W-101"
  groupName: string;       // "WG-1"
  groupWidth: number;      // precise width from group (inches)
  groupHeight: number;     // precise height from group (inches)
  roundedWidth: string;    // "40" from width_x_height
  roundedHeight: string;   // "18" from width_x_height
  unitedInches: number;
  area: number;
  selected: boolean;       // for UI selection
}

// Helper to parse Hover measurements into usable window data
export function parseHoverMeasurements(data: HoverMeasurements): ParsedHoverWindow[] {
  const { windows, window_groups } = data.openings;

  // Build a map from window label to group
  const windowToGroup = new Map<string, HoverWindowGroup>();
  for (const group of window_groups) {
    for (const windowLabel of group.windows) {
      windowToGroup.set(windowLabel, group);
    }
  }

  // Sort window groups by name for consistent ordering
  const sortedGroups = [...window_groups].sort((a, b) => {
    const numA = parseInt(a.name.replace('WG-', ''));
    const numB = parseInt(b.name.replace('WG-', ''));
    return numA - numB;
  });

  // Build parsed windows in group order
  const parsed: ParsedHoverWindow[] = [];
  const processedWindows = new Set<string>();

  for (const group of sortedGroups) {
    // Sort windows within group by label
    const sortedLabels = [...group.windows].sort((a, b) => {
      const numA = parseInt(a.replace('W-', ''));
      const numB = parseInt(b.replace('W-', ''));
      return numA - numB;
    });

    for (const label of sortedLabels) {
      if (processedWindows.has(label)) continue;
      processedWindows.add(label);

      const windowData = windows.find((w) => w.opening === label);
      if (!windowData) continue;

      // Parse "40\" x 18\"" format
      const sizeMatch = windowData.width_x_height.match(/(\d+)"\s*x\s*(\d+)"/);
      const roundedWidth = sizeMatch ? sizeMatch[1] : '?';
      const roundedHeight = sizeMatch ? sizeMatch[2] : '?';

      // Parse united inches string
      const uiMatch = windowData.united_inches.match(/(\d+)/);
      const unitedInches = uiMatch ? parseInt(uiMatch[1]) : 0;

      parsed.push({
        label,
        groupName: group.name,
        groupWidth: group.width,
        groupHeight: group.height,
        roundedWidth,
        roundedHeight,
        unitedInches,
        area: windowData.area,
        selected: true, // default to selected
      });
    }
  }

  // Add any windows not in groups (shouldn't happen but safety)
  for (const w of windows) {
    if (!processedWindows.has(w.opening)) {
      const sizeMatch = w.width_x_height.match(/(\d+)"\s*x\s*(\d+)"/);
      parsed.push({
        label: w.opening,
        groupName: 'Ungrouped',
        groupWidth: sizeMatch ? parseInt(sizeMatch[1]) : 0,
        groupHeight: sizeMatch ? parseInt(sizeMatch[2]) : 0,
        roundedWidth: sizeMatch ? sizeMatch[1] : '?',
        roundedHeight: sizeMatch ? sizeMatch[2] : '?',
        unitedInches: 0,
        area: w.area,
        selected: true,
      });
    }
  }

  return parsed;
}
