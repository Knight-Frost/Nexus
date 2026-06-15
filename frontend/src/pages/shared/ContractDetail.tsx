import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { adminApi, landlordApi, tenantApi } from '@/lib/endpoints';
import { contractStatusTone, formatCents, formatDate, humanize } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Textarea } from '@/components/ui/Field';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import type { Contract } from '@/lib/types';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-sm font-medium text-ink-900">{value}</dd>
    </div>
  );
}

export function ContractDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const role = user?.role;
  const { toast } = useToast();

  const { data, loading, error, reload } = useApi<Contract | null>(async () => {
    if (role === 'tenant') return tenantApi.contract(id);
    if (role === 'landlord') {
      return (await landlordApi.contracts()).find((c) => c.id === id) ?? null;
    }
    if (role === 'admin') {
      return (await adminApi.contracts()).data.find((c) => c.id === id) ?? null;
    }
    return null;
  }, [id, role]);

  const [confirmAction, setConfirmAction] = useState<'send' | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept() {
    setSubmitting(true);
    try {
      await tenantApi.acceptContract(id);
      toast('Contract accepted', 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to accept contract', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSend() {
    setSubmitting(true);
    try {
      await landlordApi.sendContract(id);
      toast('Contract sent to tenant', 'success');
      setConfirmAction(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send contract', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTerminate() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError('A reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (role === 'tenant') {
        await tenantApi.terminateContract(id, trimmed);
      } else {
        await landlordApi.terminateContract(id, trimmed);
      }
      toast('Contract terminated', 'success');
      setTerminateOpen(false);
      setReason('');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to terminate contract', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function openTerminate() {
    setReason('');
    setReasonError(undefined);
    setTerminateOpen(true);
  }

  const backLink = (
    <Link to="/app/contracts" className="text-sm font-medium text-brand-700 hover:text-brand-800">
      ← Back to contracts
    </Link>
  );

  if (loading) {
    return (
      <div>
        {backLink}
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {backLink}
        <div className="mt-4">
          <ErrorState message={error.message} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {backLink}
        <div className="mt-4">
          <ErrorState title="Contract not found" message="This contract could not be located." />
        </div>
      </div>
    );
  }

  const contract = data;

  const actions: React.ReactNode[] = [];
  if (role === 'tenant' && contract.status === 'pending_tenant') {
    actions.push(
      <Button key="accept" onClick={handleAccept} loading={submitting}>
        Accept
      </Button>,
      <Button key="decline" variant="danger" onClick={openTerminate} disabled={submitting}>
        Decline
      </Button>,
    );
  }
  if (role === 'tenant' && contract.status === 'active') {
    actions.push(
      <Button key="terminate" variant="danger" onClick={openTerminate} disabled={submitting}>
        Terminate
      </Button>,
    );
  }
  if (role === 'landlord' && contract.status === 'draft') {
    actions.push(
      <Button key="send" onClick={() => setConfirmAction('send')} disabled={submitting}>
        Send to tenant
      </Button>,
    );
  }
  if (role === 'landlord' && contract.status === 'active') {
    actions.push(
      <Button key="terminate" variant="danger" onClick={openTerminate} disabled={submitting}>
        Terminate
      </Button>,
    );
  }

  return (
    <div>
      <div className="mb-4">{backLink}</div>

      <PageHeader
        title="Contract"
        description={`${formatCents(contract.rent_amount)}/mo · ${humanize(contract.billing_cycle)}`}
        actions={actions.length > 0 ? <>{actions}</> : undefined}
      />

      <Card>
        <CardHeader
          title="Summary"
          action={
            <Badge tone={contractStatusTone(contract.status)}>{humanize(contract.status)}</Badge>
          }
        />
        <CardBody className="pt-2">
          <dl className="divide-y divide-ink-100">
            <DetailRow
              label="Rent"
              value={`${formatCents(contract.rent_amount)} ${contract.currency}`}
            />
            <DetailRow label="Billing cycle" value={humanize(contract.billing_cycle)} />
            <DetailRow label="Payment day" value={`Day ${contract.payment_day} of each cycle`} />
            <DetailRow label="Start date" value={formatDate(contract.start_date)} />
            <DetailRow label="End date" value={formatDate(contract.end_date)} />
            <DetailRow label="Landlord" value={`#${contract.landlord_id}`} />
            <DetailRow label="Tenant" value={`#${contract.tenant_id}`} />
            {contract.termination_reason && (
              <DetailRow label="Termination reason" value={contract.termination_reason} />
            )}
          </dl>
        </CardBody>
      </Card>

      <Modal
        open={confirmAction === 'send'}
        onClose={() => !submitting && setConfirmAction(null)}
        title="Send contract to tenant"
        description="The tenant will be notified and asked to accept this contract."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSend} loading={submitting}>
              Send
            </Button>
          </>
        }
      />

      <Modal
        open={terminateOpen}
        onClose={() => !submitting && setTerminateOpen(false)}
        title={role === 'tenant' && contract.status === 'pending_tenant' ? 'Decline contract' : 'Terminate contract'}
        description="Provide a reason. This action cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTerminateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleTerminate} loading={submitting}>
              Confirm
            </Button>
          </>
        }
      >
        <Field label="Reason" required error={reasonError}>
          {(fieldId, invalid) => (
            <Textarea
              id={fieldId}
              invalid={invalid}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              placeholder="Explain why…"
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}
