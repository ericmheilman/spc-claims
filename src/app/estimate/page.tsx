'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  Download, 
  Share2, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Calculator,
  Building,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: number;
  tax: number;
  rcv: number;
  depreciation: number;
  acv: number;
}

interface Category {
  name: string;
  items: LineItem[];
  totals: {
    rcv: number;
    depreciation: number;
    acv: number;
  };
}

interface EstimateData {
  insured: {
    name: string;
    phone: string;
    email: string;
  };
  property: {
    address: string;
  };
  claimRep: {
    name: string;
    phone: string;
    email: string;
  };
  estimator: string;
  claimNumber: string;
  policyNumber: string;
  typeOfLoss: string;
  insuranceCompany: string;
  dates: {
    dateOfLoss: string;
    dateReceived: string;
    dateInspected: string;
    dateEntered: string;
    dateEstCompleted: string;
  };
  priceList: string;
  estimateId: string;
  description: string;
  categories: Category[];
  summary: {
    lineItemTotal: number;
    materialSalesTax: number;
    rcv: number;
    depreciation: number;
    acv: number;
    deductible: number;
    netClaim: number;
    totalRecoverableDepreciation: number;
    netClaimIfRecovered: number;
    overheadProfit: number;
    adjustedFinalRcv: number;
    adjustedFinalAcv: number;
    adjustedNetClaim: number;
    adjustedNetClaimIfRecovered: number;
  };
}

export default function EstimatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [estimateData, setEstimateData] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd fetch this from the API based on the claim ID
    // For now, we'll use the sample data provided
    const sampleData: EstimateData = {
      insured: {
        name: "EUNJEE SABLAN",
        phone: "(571) 228-8961",
        email: "EUNSABLAN@YAHOO.COM"
      },
      property: {
        address: "433 SANTA ANNA TRAIL, MARTINEZ, GA 30907-4900"
      },
      claimRep: {
        name: "Christy Dean",
        phone: "(800) 806-5570 x 1220723",
        email: "cdeas@allstate.com"
      },
      estimator: "Grok 4 (Adjusted Estimate)",
      claimNumber: "0771214871",
      policyNumber: "000810846497",
      typeOfLoss: "Windstorm and Hail",
      insuranceCompany: "Allstate Vehicle and Property Insurance Company",
      dates: {
        dateOfLoss: "9/25/2024 12:00 AM",
        dateReceived: "10/3/2024 8:27 AM",
        dateInspected: "10/9/2024 1:42 PM",
        dateEntered: "9/25/2025 12:00 PM",
        dateEstCompleted: "9/25/2025 12:00 PM"
      },
      priceList: "SCCH8X_SEP25 (Updated from GAAU8X_MAY25 per current pricing and adjustments)",
      estimateId: "ADJUSTED_EUNJEE_SABLAN1",
      description: "This adjusted estimate incorporates discrepancies from the precise aerial measurement report (e.g., minor area variance of 3.4% adjusted down to 19.02 SQ per Rule 1, citing Report Page 2: Total Roof Area = 1,902 sq ft). Adjustments include upgrading to laminated shingles for complex roof (13 facets >10 per Rule 30), synthetic underlayment for high-wind zone (per Rule 38), added line items for omitted materials and labor (e.g., rake starter per Rule 6, ice & water barrier for valleys 17 ft >10 ft per Rule 22), ventilation upgrades to meet code (added ridge vent per Rule 126, NFA calculation: attic 1,700 sq ft requires 5.67 sq ft balanced; current turtle vents ~1.74 sq ft, added ridge 28 ft at 18 in²/LF = 3.5 sq ft total ~5.24 sq ft), override D&R to R&R for vents per IRC R908.5 (Rule 125), additional penetrations (11 vs 5 per Rule 27), flashing omissions (counterflashing 4 ft per Rule 28, step flashing 41 ft per Rule 29), sealant for penetrations area 12 sq ft >5 sq ft (per Rule 36), complex labor premium (per Rule 46), multi-story premium (stories >1 per Rule 47), permit fee (per Rule 58), weather delay contingency (per Rule 59), material escalation from May to Sep 2025 (4 months, 5% applied per Rule 85), and overhead & profit (20% for >$5k claim per Rule 82). Prices updated to current list (per Rule 96). Narratives for key adjustments (e.g., waste math per Rule 11: starter 220 ft + ridge/hip cap 164 ft requires ~3.84 SQ extra shingles if cut, equivalent cost ~$904 vs separate items $1,742; waste increased to 39% to match separate cost parity, but separate lines used here for laminated upgrade) support increases per Rule 100.",
      categories: [
        {
          name: "Dwelling Roof",
          items: [
            { description: "Remove 3 tab - 25 yr. - composition shingle roofing - incl. felt", quantity: "19.02", unitPrice: 65.96, tax: 0.00, rcv: 1254.66, depreciation: 0.00, acv: 1254.66 },
            { description: "Roofing felt - synthetic underlayment", quantity: "19.02", unitPrice: 47.68, tax: 0.00, rcv: 907.27, depreciation: 635.09, acv: 272.18 },
            { description: "Laminated - comp. shingle rfg. - w/out felt (23% waste applied)", quantity: "23.39", unitPrice: 249.37, tax: 0.00, rcv: 5831.77, depreciation: 3265.79, acv: 2565.98 },
            { description: "Additional premium for laminated upgrade (10%)", quantity: "1.00", unitPrice: 583.18, tax: 0.00, rcv: 583.18, depreciation: 326.58, acv: 256.60 },
            { description: "R&R Roof vent - turtle type - Metal (override D&R to R&R)", quantity: "5.00", unitPrice: 84.79, tax: 0.00, rcv: 423.95, depreciation: 169.58, acv: 254.37 },
            { description: "Flashing - pipe jack (additional 6 + original 5)", quantity: "11.00", unitPrice: 59.03, tax: 0.00, rcv: 649.33, depreciation: 259.73, acv: 389.60 },
            { description: "Drip edge", quantity: "232.00", unitPrice: 3.22, tax: 0.00, rcv: 746.24, depreciation: 298.50, acv: 447.74 },
            { description: "Remove Additional charge for high roof (2 stories or greater) (adjusted SQ)", quantity: "11.63", unitPrice: 6.68, tax: 0.00, rcv: 77.69, depreciation: 0.00, acv: 77.69 },
            { description: "Additional charge for high roof (2 stories or greater) (adjusted SQ)", quantity: "11.63", unitPrice: 19.65, tax: 0.00, rcv: 228.55, depreciation: 0.00, acv: 228.55 },
            { description: "Asphalt starter - universal starter course (eaves + rakes)", quantity: "232.00", unitPrice: 1.73, tax: 0.00, rcv: 401.36, depreciation: 224.76, acv: 176.60 },
            { description: "Hip / Ridge cap - Standard profile - Composition Shingles", quantity: "164.00", unitPrice: 8.30, tax: 0.00, rcv: 1361.20, depreciation: 762.27, acv: 598.93 },
            { description: "Counterflashing - Apron flashing", quantity: "4.00", unitPrice: 11.00, tax: 0.00, rcv: 44.00, depreciation: 24.64, acv: 19.36 },
            { description: "Step flashing", quantity: "41.00", unitPrice: 10.28, tax: 0.00, rcv: 421.48, depreciation: 236.03, acv: 185.45 },
            { description: "Apply roofing sealant/cement - per LF", quantity: "37.00", unitPrice: 0.72, tax: 0.00, rcv: 26.64, depreciation: 0.00, acv: 26.64 },
            { description: "Ice & water barrier (for valleys)", quantity: "51.00", unitPrice: 1.63, tax: 0.00, rcv: 83.13, depreciation: 46.55, acv: 36.58 },
            { description: "Continuous ridge vent - shingle-over style (for ventilation adequacy)", quantity: "28.00", unitPrice: 10.87, tax: 0.00, rcv: 304.36, depreciation: 0.00, acv: 304.36 },
            { description: "Roofing - General Laborer - per hour (complex roof premium 10% materials)", quantity: "21.00", unitPrice: 56.25, tax: 0.00, rcv: 1181.25, depreciation: 0.00, acv: 1181.25 },
            { description: "Roofing - General Laborer - per hour (multi-story premium ~15% labor)", quantity: "4.00", unitPrice: 56.25, tax: 0.00, rcv: 225.00, depreciation: 0.00, acv: 225.00 },
            { description: "Roofing (Bid Item) - Permit fee", quantity: "1.00", unitPrice: 150.00, tax: 0.00, rcv: 150.00, depreciation: 0.00, acv: 150.00 },
            { description: "Roofing - General Laborer - per hour (weather delay contingency 3%)", quantity: "8.00", unitPrice: 56.25, tax: 0.00, rcv: 450.00, depreciation: 0.00, acv: 450.00 },
            { description: "Roofing (Bid Item) - Material escalation (5%)", quantity: "1.00", unitPrice: 589.39, tax: 0.00, rcv: 589.39, depreciation: 0.00, acv: 589.39 },
            { description: "Roofing (Bid Item) - Contingency for hidden damages (e.g., sheathing)", quantity: "1.00", unitPrice: 500.00, tax: 0.00, rcv: 500.00, depreciation: 0.00, acv: 500.00 }
          ],
          totals: { rcv: 16436.78, depreciation: 6277.19, acv: 10159.59 }
        },
        {
          name: "Interior",
          items: [
            { description: "Seal/prime then paint the surface area (2 coats) - Ceiling Repair", quantity: "20.00", unitPrice: 1.31, tax: 0.00, rcv: 26.20, depreciation: 0.00, acv: 26.20 },
            { description: "Paint the surface area - one coat - Ceiling repair", quantity: "121.00", unitPrice: 0.92, tax: 0.00, rcv: 111.32, depreciation: 74.21, acv: 37.11 },
            { description: "Paint the surface area - one coat - Ceiling repair (Bathroom)", quantity: "144.67", unitPrice: 0.92, tax: 0.00, rcv: 133.10, depreciation: 88.73, acv: 44.37 },
            { description: "Seal/prime then paint the surface area (2 coats) - Ceiling repair (Bathroom)", quantity: "24.00", unitPrice: 1.31, tax: 0.00, rcv: 31.44, depreciation: 0.00, acv: 31.44 }
          ],
          totals: { rcv: 302.06, depreciation: 162.94, acv: 139.12 }
        },
        {
          name: "Dwelling Elevation",
          items: [
            { description: "R&R Siding - beveled - cedar (clapboard)", quantity: "3.00", unitPrice: 11.28, tax: 0.00, rcv: 33.84, depreciation: 0.00, acv: 33.84 },
            { description: "Seal & paint wood siding", quantity: "3.00", unitPrice: 2.52, tax: 0.00, rcv: 7.56, depreciation: 0.00, acv: 7.56 },
            { description: "Paint wood siding - 1 coat", quantity: "956.00", unitPrice: 1.68, tax: 0.00, rcv: 1606.08, depreciation: 0.00, acv: 1606.08 }
          ],
          totals: { rcv: 1647.48, depreciation: 0.00, acv: 1647.48 }
        },
        {
          name: "Tarp",
          items: [
            { description: "R&R Tarp - all-purpose poly - per sq ft (labor and material)", quantity: "103.00", unitPrice: 1.09, tax: 0.00, rcv: 112.27, depreciation: 0.00, acv: 112.27 },
            { description: "Roofer - per hour", quantity: "2.00", unitPrice: 120.34, tax: 0.00, rcv: 240.68, depreciation: 0.00, acv: 240.68 }
          ],
          totals: { rcv: 352.95, depreciation: 0.00, acv: 352.95 }
        },
        {
          name: "General Items",
          items: [
            { description: "Haul debris - per pickup truck load - including dump fees", quantity: "0.25", unitPrice: 165.06, tax: 0.00, rcv: 41.27, depreciation: 0.00, acv: 41.27 }
          ],
          totals: { rcv: 41.27, depreciation: 0.00, acv: 41.27 }
        },
        {
          name: "Labor Minimums Applied",
          items: [
            { description: "Siding labor minimum", quantity: "1.00", unitPrice: 385.55, tax: 0.00, rcv: 385.55, depreciation: 0.00, acv: 385.55 },
            { description: "Temporary repair services labor minimum", quantity: "1.00", unitPrice: 115.64, tax: 0.00, rcv: 115.64, depreciation: 0.00, acv: 115.64 }
          ],
          totals: { rcv: 501.19, depreciation: 0.00, acv: 501.19 }
        }
      ],
      summary: {
        lineItemTotal: 19281.73,
        materialSalesTax: 0.00,
        rcv: 19281.73,
        depreciation: 6440.13,
        acv: 12841.60,
        deductible: 2500.00,
        netClaim: 10341.60,
        totalRecoverableDepreciation: 6440.13,
        netClaimIfRecovered: 16781.73,
        overheadProfit: 3856.35,
        adjustedFinalRcv: 23138.08,
        adjustedFinalAcv: 16697.95,
        adjustedNetClaim: 14197.95,
        adjustedNetClaimIfRecovered: 20638.08
      }
    };

    setTimeout(() => {
      setEstimateData(sampleData);
      setLoading(false);
    }, 1000);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading adjusted estimate...</p>
        </div>
      </div>
    );
  }

  if (!estimateData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Estimate Not Found</h2>
          <p className="text-gray-600 mb-4">The requested estimate could not be found.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Adjusted Insurance Estimate</h1>
                <p className="text-sm text-blue-600">SPC Claims Processing System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
              <button className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                New Estimate
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estimate Header */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Insured Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Insured
              </h3>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{estimateData.insured.name}</p>
                <p className="text-gray-600 flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  {estimateData.insured.phone}
                </p>
                <p className="text-gray-600 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {estimateData.insured.email}
                </p>
              </div>
            </div>

            {/* Property Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-green-600" />
                Property
              </h3>
              <div className="space-y-2">
                <p className="text-gray-600 flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  {estimateData.property.address}
                </p>
              </div>
            </div>

            {/* Claim Representative */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-purple-600" />
                Claim Rep.
              </h3>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{estimateData.claimRep.name}</p>
                <p className="text-gray-600 flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  {estimateData.claimRep.phone}
                </p>
                <p className="text-gray-600 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {estimateData.claimRep.email}
                </p>
              </div>
            </div>
          </div>

          {/* Claim Details */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Estimator</p>
                <p className="text-lg font-semibold text-gray-900">{estimateData.estimator}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Claim Number</p>
                <p className="text-lg font-semibold text-gray-900">{estimateData.claimNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Policy Number</p>
                <p className="text-lg font-semibold text-gray-900">{estimateData.policyNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Type of Loss</p>
                <p className="text-lg font-semibold text-gray-900">{estimateData.typeOfLoss}</p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Important Dates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Date of Loss</p>
                <p className="text-gray-900">{formatDate(estimateData.dates.dateOfLoss)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date Received</p>
                <p className="text-gray-900">{formatDate(estimateData.dates.dateReceived)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date Inspected</p>
                <p className="text-gray-900">{formatDate(estimateData.dates.dateInspected)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date Entered</p>
                <p className="text-gray-900">{formatDate(estimateData.dates.dateEntered)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date Est. Completed</p>
                <p className="text-gray-900">{formatDate(estimateData.dates.dateEstCompleted)}</p>
              </div>
            </div>
          </div>

          {/* Estimate Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Insurance Company</p>
                <p className="text-gray-900">{estimateData.insuranceCompany}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Price List</p>
                <p className="text-gray-900">{estimateData.priceList}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Estimate ID</p>
              <p className="text-gray-900 font-mono">{estimateData.estimateId}</p>
            </div>
          </div>
        </div>

        {/* Adjustment Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Adjustment Summary
          </h3>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-sm text-gray-700 leading-relaxed">{estimateData.description}</p>
          </div>
        </div>

        {/* Line Items by Category */}
        {estimateData.categories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RCV
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deprec.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ACV
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {category.items.map((item, itemIndex) => (
                    <tr key={itemIndex} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(item.tax)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatCurrency(item.rcv)}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600">
                        ({formatCurrency(Math.abs(item.depreciation))})
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatCurrency(item.acv)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr className="font-semibold">
                    <td className="px-6 py-4 text-sm text-gray-900" colSpan={4}>
                      Totals: {category.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(category.totals.rcv)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      ({formatCurrency(Math.abs(category.totals.depreciation))})
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(category.totals.acv)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-green-600" />
            Financial Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Summary */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Summary for All Items
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Line Item Total:</span>
                  <span className="font-medium">{formatCurrency(estimateData.summary.lineItemTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Material Sales Tax:</span>
                  <span className="font-medium">{formatCurrency(estimateData.summary.materialSalesTax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-600">Replacement Cost Value (RCV):</span>
                  <span className="font-semibold text-green-600">{formatCurrency(estimateData.summary.rcv)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Less Depreciation:</span>
                  <span className="font-medium text-red-600">({formatCurrency(Math.abs(estimateData.summary.depreciation))})</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-600">Actual Cash Value (ACV):</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(estimateData.summary.acv)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Less Deductible:</span>
                  <span className="font-medium text-red-600">({formatCurrency(Math.abs(estimateData.summary.deductible))})</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-900 font-semibold">Net Claim:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(estimateData.summary.netClaim)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Recoverable Depreciation:</span>
                  <span className="font-medium text-green-600">{formatCurrency(estimateData.summary.totalRecoverableDepreciation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Claim if Depreciation is Recovered:</span>
                  <span className="font-medium text-green-600">{formatCurrency(estimateData.summary.netClaimIfRecovered)}</span>
                </div>
              </div>
            </div>

            {/* Adjusted Summary */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Adjusted Final Summary (with O&P)
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Overhead & Profit (20% on RCV):</span>
                  <span className="font-medium">{formatCurrency(estimateData.summary.overheadProfit)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-900 font-semibold">Adjusted Final RCV (with O&P):</span>
                  <span className="font-bold text-green-600">{formatCurrency(estimateData.summary.adjustedFinalRcv)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-900 font-semibold">Adjusted Final ACV (with O&P):</span>
                  <span className="font-bold text-blue-600">{formatCurrency(estimateData.summary.adjustedFinalAcv)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-900 font-semibold">Adjusted Net Claim (ACV - Deductible):</span>
                  <span className="font-bold text-gray-900">{formatCurrency(estimateData.summary.adjustedNetClaim)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900 font-semibold">Adjusted Net Claim if Depreciation Recovered:</span>
                  <span className="font-bold text-green-600">{formatCurrency(estimateData.summary.adjustedNetClaimIfRecovered)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-600">Total RCV</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(estimateData.summary.adjustedFinalRcv)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center">
                <Calculator className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-600">Net Claim</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(estimateData.summary.adjustedNetClaim)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-purple-600">Recoverable Depreciation</p>
                  <p className="text-2xl font-bold text-purple-700">{formatCurrency(estimateData.summary.totalRecoverableDepreciation)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

