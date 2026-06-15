import { useNavigate } from 'react-router';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { adminApi, landlordApi, tenantApi } from '@/lib/endpoints';
import { contractStatusTone, formatCents, formatDate, humanize } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconDoc } from '@/components/ui/icons';
import type { Contract } from '@/lib/types';

export function ContractsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const navigate = useNavigate();

  const { data, loading, error, reload } = useApi<Contract[]>(async () => {
    if (role === 'tenant') return tenantApi.contracts();
    if (role === 'landlord') return landlordApi.contracts();
    if (role === 'admin') return (await adminApi.contracts()).data;
    return [];
  }, [role]);

  const emptyDescription =
    role === 'landlord'
      ? 'Contracts you create for tenants will appear here.'
      : role === 'admin'
        ? 'Contracts created across the platform will appear here.'
        : 'When a landlord sends you a contract, it’ll appear here for review.';

  return (
    <div>
      <PageHeader title="Contracts" description="Lease agreements and their current status." />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={<IconDoc />} title="No contracts yet" description={emptyDescription} />
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TH>Rent</TH>
                <TH>Term</TH>
                <TH>Status</TH>
              </THead>
              <TBody>
                {data.map((contract) => (
                  <TR key={contract.id} onClick={() => navigate(`/app/contracts/${contract.id}`)}>
                    <TD className="font-medium text-ink-900">
                      {formatCents(contract.rent_amount)}/mo
                    </TD>
                    <TD className="whitespace-nowrap text-ink-600">
                      {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                    </TD>
                    <TD>
                      <Badge tone={contractStatusTone(contract.status)}>
                        {humanize(contract.status)}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
