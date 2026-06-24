<?php

namespace Database\Seeders\Dev;

/**
 * SeedCatalog
 *
 * The SINGLE deterministic source of truth for the development demo graph.
 *
 * Everything here is fictional and Ghana-focused. Values are FIXED (no random
 * generation) so repeated `migrate:fresh --seed` runs produce a stable graph
 * that tests and screenshots can rely on. Money is expressed in GH₵ major units
 * on the catalog and converted to integer cents where the schema stores cents.
 *
 * Demo users are referenced everywhere by their email LOCAL PART (the "key"),
 * e.g. 'tenant.showcase'. Seeders resolve a key to a User via
 * email = "{key}@{config('seed.development.email_domain')}".
 */
class SeedCatalog
{
    /**
     * Landlord demo accounts (10). `key` is the email local part.
     *
     * verification: 'verified' | 'pending' | 'unverified' | 'rejected'
     * account:      'active' | 'suspended' | 'blocked'
     * features:     'full' | 'limited' | 'none'
     */
    public const LANDLORDS = [
        ['key' => 'landlord.verified', 'first' => 'Kwame', 'last' => 'Mensah', 'city' => 'Accra', 'verification' => 'verified', 'account' => 'active', 'features' => 'full'],
        ['key' => 'landlord.estate', 'first' => 'Ama', 'last' => 'Owusu', 'city' => 'Accra', 'verification' => 'verified', 'account' => 'active', 'features' => 'full'],
        ['key' => 'landlord.coastal', 'first' => 'Kofi', 'last' => 'Asante', 'city' => 'Accra', 'verification' => 'verified', 'account' => 'active', 'features' => 'full'],
        ['key' => 'landlord.homes', 'first' => 'Akosua', 'last' => 'Boateng', 'city' => 'Tema', 'verification' => 'verified', 'account' => 'active', 'features' => 'full'],
        ['key' => 'landlord.kumasi', 'first' => 'Yaw', 'last' => 'Darko', 'city' => 'Kumasi', 'verification' => 'verified', 'account' => 'active', 'features' => 'full'],
        ['key' => 'landlord.takoradi', 'first' => 'Abena', 'last' => 'Adjei', 'city' => 'Takoradi', 'verification' => 'verified', 'account' => 'active', 'features' => 'full'],
        ['key' => 'landlord.limited', 'first' => 'Kojo', 'last' => 'Annan', 'city' => 'Accra', 'verification' => 'verified', 'account' => 'active', 'features' => 'limited'],
        ['key' => 'landlord.pending', 'first' => 'Esi', 'last' => 'Quaye', 'city' => 'Accra', 'verification' => 'pending', 'account' => 'active', 'features' => 'none'],
        ['key' => 'landlord.unverified', 'first' => 'Fiifi', 'last' => 'Acquah', 'city' => 'Cape Coast', 'verification' => 'unverified', 'account' => 'active', 'features' => 'none'],
        ['key' => 'landlord.suspended', 'first' => 'Adwoa', 'last' => 'Sarpong', 'city' => 'Accra', 'verification' => 'unverified', 'account' => 'suspended', 'features' => 'none'],
    ];

    /**
     * Tenant demo accounts (20). The first nine drive specific contract/ledger
     * scenarios (see UNITS[].contract_tenant); the rest are applicants/savers
     * that give the listings, applications and analytics meaningful volume.
     */
    public const TENANTS = [
        ['key' => 'tenant.showcase', 'first' => 'Efua', 'last' => 'Addo', 'city' => 'Accra', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant.active', 'first' => 'Nana', 'last' => 'Yeboah', 'city' => 'Accra', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant.current', 'first' => 'Kwesi', 'last' => 'Mensa', 'city' => 'Accra', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant.new', 'first' => 'Adjoa', 'last' => 'Frimpong', 'city' => 'Tema', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant.luxury', 'first' => 'Selorm', 'last' => 'Agbeko', 'city' => 'Accra', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant.pending', 'first' => 'Mawuli', 'last' => 'Dzata', 'city' => 'Accra', 'verification' => 'pending', 'account' => 'active'],
        ['key' => 'tenant.review', 'first' => 'Akua', 'last' => 'Nkrumah', 'city' => 'Accra', 'verification' => 'needs_more_information', 'account' => 'active'],
        ['key' => 'tenant.former', 'first' => 'Yaa', 'last' => 'Asantewaa', 'city' => 'Kumasi', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant.expired', 'first' => 'Kwabena', 'last' => 'Osei', 'city' => 'Takoradi', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant.applicant', 'first' => 'Araba', 'last' => 'Tetteh', 'city' => 'Accra', 'verification' => 'rejected', 'account' => 'active'],
        ['key' => 'tenant10', 'first' => 'Kwaku', 'last' => 'Appiah', 'city' => 'Accra', 'verification' => 'unverified', 'account' => 'active'],
        ['key' => 'tenant11', 'first' => 'Afua', 'last' => 'Bonsu', 'city' => 'Kumasi', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant12', 'first' => 'Yusif', 'last' => 'Iddrisu', 'city' => 'Tamale', 'verification' => 'pending', 'account' => 'active'],
        ['key' => 'tenant13', 'first' => 'Comfort', 'last' => 'Ofori', 'city' => 'Accra', 'verification' => 'unverified', 'account' => 'active'],
        ['key' => 'tenant14', 'first' => 'Emmanuel', 'last' => 'Tetteh', 'city' => 'Tema', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant15', 'first' => 'Gifty', 'last' => 'Asare', 'city' => 'Accra', 'verification' => 'unverified', 'account' => 'active'],
        ['key' => 'tenant16', 'first' => 'Ibrahim', 'last' => 'Mohammed', 'city' => 'Kumasi', 'verification' => 'verified', 'account' => 'active'],
        ['key' => 'tenant17', 'first' => 'Naa', 'last' => 'Lamptey', 'city' => 'Accra', 'verification' => 'pending', 'account' => 'active'],
        ['key' => 'tenant.suspended', 'first' => 'Patience', 'last' => 'Agyeman', 'city' => 'Accra', 'verification' => 'unverified', 'account' => 'suspended'],
        ['key' => 'tenant.blocked', 'first' => 'Daniel', 'last' => 'Quartey', 'city' => 'Accra', 'verification' => 'unverified', 'account' => 'blocked'],
    ];

    /**
     * Properties (10) spread across the six verified, full-feature landlords.
     * `landlord` is a LANDLORDS key. `state` uses Ghana 2-char region codes
     * (the schema column is char(2)); `country` is 'GH'.
     */
    public const PROPERTIES = [
        ['key' => 'cantonments-gardens', 'landlord' => 'landlord.verified', 'name' => 'Cantonments Gardens', 'type' => 'apartment', 'street' => '14 Independence Avenue', 'city' => 'Cantonments', 'state' => 'GA', 'zip' => 'GA-100', 'year' => 2015, 'desc' => 'Modern apartment complex in the diplomatic heart of Cantonments, Accra.'],
        ['key' => 'labone-heights', 'landlord' => 'landlord.verified', 'name' => 'Labone Heights', 'type' => 'apartment', 'street' => '5 Labone Crescent', 'city' => 'Labone', 'state' => 'GA', 'zip' => 'GA-118', 'year' => 2019, 'desc' => 'Quiet, secure apartments minutes from Labadi beach and Osu.'],
        ['key' => 'east-legon-court', 'landlord' => 'landlord.estate', 'name' => 'East Legon Court', 'type' => 'townhouse', 'street' => '7 Boundary Road', 'city' => 'East Legon', 'state' => 'GA', 'zip' => 'GA-200', 'year' => 2018, 'desc' => 'Premium townhouses near the American House and A&C Mall.'],
        ['key' => 'airport-residences', 'landlord' => 'landlord.estate', 'name' => 'Airport Residences', 'type' => 'condo', 'street' => '3 Aviation Road', 'city' => 'Airport Residential', 'state' => 'GA', 'zip' => 'GA-300', 'year' => 2021, 'desc' => 'Luxury condominium tower in the Airport Residential Area.'],
        ['key' => 'osu-seaview', 'landlord' => 'landlord.coastal', 'name' => 'Osu Seaview Lofts', 'type' => 'multi_family', 'street' => '21 Oxford Street', 'city' => 'Osu', 'state' => 'GA', 'zip' => 'GA-145', 'year' => 2017, 'desc' => 'Converted lofts above the buzz of Oxford Street, Osu.'],
        ['key' => 'spintex-villas', 'landlord' => 'landlord.coastal', 'name' => 'Spintex Garden Villas', 'type' => 'single_family', 'street' => '88 Spintex Road', 'city' => 'Spintex', 'state' => 'GA', 'zip' => 'GA-410', 'year' => 2016, 'desc' => 'Detached family villas with gardens along the Spintex corridor.'],
        ['key' => 'adenta-homes', 'landlord' => 'landlord.homes', 'name' => 'Adenta Family Homes', 'type' => 'single_family', 'street' => '12 Adenta Housing Down', 'city' => 'Adenta', 'state' => 'GA', 'zip' => 'GA-512', 'year' => 2014, 'desc' => 'Spacious family homes in the established Adenta township.'],
        ['key' => 'tema-community', 'landlord' => 'landlord.homes', 'name' => 'Tema Community 25', 'type' => 'multi_family', 'street' => 'Site 25, Tema', 'city' => 'Tema', 'state' => 'GA', 'zip' => 'GA-620', 'year' => 2020, 'desc' => 'Affordable co-living and starter units in Tema Community 25.'],
        ['key' => 'kumasi-ridge', 'landlord' => 'landlord.kumasi', 'name' => 'Kumasi Ridge Apartments', 'type' => 'apartment', 'street' => '4 Ridge Road', 'city' => 'Kumasi', 'state' => 'AH', 'zip' => 'AH-210', 'year' => 2018, 'desc' => 'Contemporary apartments on the cool Kumasi ridge.'],
        ['key' => 'takoradi-beachfront', 'landlord' => 'landlord.takoradi', 'name' => 'Takoradi Beachfront', 'type' => 'condo', 'street' => '2 Beach Road', 'city' => 'Takoradi', 'state' => 'WP', 'zip' => 'WP-150', 'year' => 2022, 'desc' => 'Beachfront condominiums in the oil city of Takoradi.'],
    ];

    /**
     * 20 rentable units, each a DISTINCT type (no clones). `property` is a
     * PROPERTIES key. `rent`/`deposit` are GH₵ major units.
     *
     * listing:      draft|pending_review|active|inactive|rejected|archived
     * availability: available|occupied|pending|maintenance|unlisted
     * contract:     null|draft|pending_tenant|active|terminated|expired
     * tenant:       TENANTS key (when contract is set)
     * months:       active-contract age in months (ledger depth)
     * ledger:       'showcase' (overdue + late fee + partial) | 'standard'
     */
    public const UNITS = [
        ['type' => 'Studio apartment', 'property' => 'cantonments-gardens', 'number' => 'ST-01', 'bedrooms' => 0, 'bathrooms' => 1, 'sqft' => 420, 'rent' => 1800, 'deposit' => 3600, 'amenities' => ['Air conditioning', 'Fibre internet', 'Security'], 'listing' => 'inactive', 'availability' => 'occupied', 'contract' => 'active', 'tenant' => 'tenant.showcase', 'months' => 4, 'ledger' => 'showcase'],
        ['type' => 'One-bedroom apartment', 'property' => 'cantonments-gardens', 'number' => '1B-04', 'bedrooms' => 1, 'bathrooms' => 1, 'sqft' => 650, 'rent' => 2800, 'deposit' => 5600, 'amenities' => ['Air conditioning', 'Parking', 'Balcony'], 'listing' => 'active', 'availability' => 'available', 'contract' => 'draft', 'tenant' => 'tenant.review', 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Two-bedroom apartment', 'property' => 'cantonments-gardens', 'number' => '2B-09', 'bedrooms' => 2, 'bathrooms' => 2, 'sqft' => 1100, 'rent' => 4500, 'deposit' => 9000, 'amenities' => ['Air conditioning', 'Parking', 'Balcony', 'Dishwasher'], 'listing' => 'inactive', 'availability' => 'occupied', 'contract' => 'active', 'tenant' => 'tenant.active', 'months' => 6, 'ledger' => 'standard'],
        ['type' => 'Three-bedroom apartment', 'property' => 'labone-heights', 'number' => '3B-02', 'bedrooms' => 3, 'bathrooms' => 2, 'sqft' => 1500, 'rent' => 7000, 'deposit' => 14000, 'amenities' => ['Air conditioning', 'Parking', 'Standby generator', 'Security'], 'listing' => 'active', 'availability' => 'pending', 'contract' => 'pending_tenant', 'tenant' => 'tenant.pending', 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Townhouse', 'property' => 'east-legon-court', 'number' => 'TH-A', 'bedrooms' => 3, 'bathrooms' => 3, 'sqft' => 1900, 'rent' => 9000, 'deposit' => 18000, 'amenities' => ['Garage', 'Private garden', 'Washer/Dryer', 'Security'], 'listing' => 'inactive', 'availability' => 'occupied', 'contract' => 'active', 'tenant' => 'tenant.current', 'months' => 9, 'ledger' => 'standard'],
        ['type' => 'Duplex unit', 'property' => 'east-legon-court', 'number' => 'DX-B', 'bedrooms' => 4, 'bathrooms' => 3, 'sqft' => 2200, 'rent' => 8000, 'deposit' => 16000, 'amenities' => ['Garage', 'Balcony', 'Study', 'Security'], 'listing' => 'inactive', 'availability' => 'unlisted', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Detached single-family home', 'property' => 'spintex-villas', 'number' => 'V-12', 'bedrooms' => 4, 'bathrooms' => 4, 'sqft' => 2600, 'rent' => 11000, 'deposit' => 22000, 'amenities' => ['Garage', 'Garden', 'Boys quarters', 'Standby generator'], 'listing' => 'inactive', 'availability' => 'occupied', 'contract' => 'active', 'tenant' => 'tenant.new', 'months' => 1, 'ledger' => 'standard'],
        ['type' => 'Shared room', 'property' => 'tema-community', 'number' => 'SR-3', 'bedrooms' => 1, 'bathrooms' => 1, 'sqft' => 220, 'rent' => 900, 'deposit' => 900, 'amenities' => ['Shared kitchen', 'Wi-Fi'], 'listing' => 'pending_review', 'availability' => 'available', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Student housing unit', 'property' => 'kumasi-ridge', 'number' => 'SH-7', 'bedrooms' => 1, 'bathrooms' => 1, 'sqft' => 300, 'rent' => 1200, 'deposit' => 2400, 'amenities' => ['Study desk', 'Wi-Fi', 'Communal laundry'], 'listing' => 'rejected', 'availability' => 'available', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Luxury apartment', 'property' => 'airport-residences', 'number' => 'LX-10', 'bedrooms' => 2, 'bathrooms' => 2, 'sqft' => 1400, 'rent' => 15000, 'deposit' => 30000, 'amenities' => ['Gym', 'Pool', 'Concierge', 'Air conditioning'], 'listing' => 'inactive', 'availability' => 'occupied', 'contract' => 'active', 'tenant' => 'tenant.luxury', 'months' => 12, 'ledger' => 'standard'],
        ['type' => 'Serviced apartment', 'property' => 'airport-residences', 'number' => 'SV-11', 'bedrooms' => 1, 'bathrooms' => 1, 'sqft' => 800, 'rent' => 13000, 'deposit' => 13000, 'amenities' => ['Housekeeping', 'Gym', 'Pool', 'Concierge'], 'listing' => 'active', 'availability' => 'available', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Garden apartment', 'property' => 'spintex-villas', 'number' => 'GA-05', 'bedrooms' => 2, 'bathrooms' => 2, 'sqft' => 1200, 'rent' => 6000, 'deposit' => 12000, 'amenities' => ['Private garden', 'Parking', 'Pet friendly'], 'listing' => 'pending_review', 'availability' => 'available', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Penthouse', 'property' => 'osu-seaview', 'number' => 'PH-TOP', 'bedrooms' => 3, 'bathrooms' => 3, 'sqft' => 2400, 'rent' => 18000, 'deposit' => 36000, 'amenities' => ['Roof terrace', 'Sea view', 'Private lift', 'Concierge'], 'listing' => 'inactive', 'availability' => 'available', 'contract' => 'terminated', 'tenant' => 'tenant.former', 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Basement apartment', 'property' => 'osu-seaview', 'number' => 'BSMT-1', 'bedrooms' => 1, 'bathrooms' => 1, 'sqft' => 560, 'rent' => 1500, 'deposit' => 3000, 'amenities' => ['Private entrance', 'Storage'], 'listing' => 'draft', 'availability' => 'unlisted', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Loft', 'property' => 'osu-seaview', 'number' => 'LFT-2', 'bedrooms' => 1, 'bathrooms' => 1, 'sqft' => 900, 'rent' => 5000, 'deposit' => 10000, 'amenities' => ['High ceilings', 'Open plan', 'Wi-Fi'], 'listing' => 'rejected', 'availability' => 'available', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Cottage', 'property' => 'takoradi-beachfront', 'number' => 'CT-01', 'bedrooms' => 2, 'bathrooms' => 1, 'sqft' => 850, 'rent' => 4000, 'deposit' => 8000, 'amenities' => ['Beach access', 'Garden', 'Parking'], 'listing' => 'inactive', 'availability' => 'available', 'contract' => 'expired', 'tenant' => 'tenant.expired', 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Bungalow', 'property' => 'adenta-homes', 'number' => 'BG-09', 'bedrooms' => 3, 'bathrooms' => 2, 'sqft' => 1600, 'rent' => 6500, 'deposit' => 13000, 'amenities' => ['Garden', 'Parking', 'Boys quarters'], 'listing' => 'archived', 'availability' => 'unlisted', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Co-living suite', 'property' => 'tema-community', 'number' => 'CL-25', 'bedrooms' => 1, 'bathrooms' => 1, 'sqft' => 350, 'rent' => 2200, 'deposit' => 2200, 'amenities' => ['Shared lounge', 'Co-working space', 'Wi-Fi', 'Cleaning'], 'listing' => 'active', 'availability' => 'available', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Short-stay furnished unit', 'property' => 'takoradi-beachfront', 'number' => 'SS-04', 'bedrooms' => 1, 'bathrooms' => 1, 'sqft' => 700, 'rent' => 7500, 'deposit' => 7500, 'amenities' => ['Fully furnished', 'Beach access', 'Weekly cleaning'], 'listing' => 'draft', 'availability' => 'unlisted', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
        ['type' => 'Family compound unit', 'property' => 'adenta-homes', 'number' => 'FC-02', 'bedrooms' => 5, 'bathrooms' => 4, 'sqft' => 3200, 'rent' => 9500, 'deposit' => 19000, 'amenities' => ['Walled compound', 'Garden', 'Boys quarters', 'Standby generator', 'Security'], 'listing' => 'active', 'availability' => 'available', 'contract' => null, 'tenant' => null, 'months' => 0, 'ledger' => 'standard'],
    ];

    /**
     * Platform feature definitions — the master gateable-feature list.
     * Shared by BOTH modes (this is reference/system data, safe for production).
     * `requires_features` is intentionally null everywhere to keep enablement
     * order-independent; identity-gated features set requires_verification.
     */
    public const FEATURES = [
        ['key' => 'listings', 'name' => 'Property Listings', 'description' => 'Create and publish property listings.', 'requires_verification' => false, 'default' => true],
        ['key' => 'applications', 'name' => 'Rental Applications', 'description' => 'Receive and decide on tenant applications.', 'requires_verification' => true, 'default' => false],
        ['key' => 'leases', 'name' => 'Digital Leases', 'description' => 'Draft and send contracts to tenants.', 'requires_verification' => true, 'default' => false],
        ['key' => 'payments', 'name' => 'Online Payments', 'description' => 'Collect rent and deposits online.', 'requires_verification' => true, 'default' => false],
        ['key' => 'maintenance', 'name' => 'Maintenance Requests', 'description' => 'Track and resolve maintenance requests.', 'requires_verification' => false, 'default' => false],
    ];

    /** Feature keys granted to a landlord by feature tier. */
    public const FEATURE_TIERS = [
        'full' => ['listings', 'applications', 'leases', 'payments', 'maintenance'],
        'limited' => ['listings'],
        'none' => [],
    ];

    /** Resolve a demo user key to a full email on the configured test domain. */
    public static function email(string $key): string
    {
        return $key.'@'.config('seed.development.email_domain', 'wyncrest.test');
    }
}
