'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { vendorsApi } from '@/features/vendors/api/vendors.api';
import { Vendor, VendorContact } from '@/features/vendors/types';
import { usePermissions } from '@/lib/permissions';

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showDeleteVendor, setShowDeleteVendor] = useState(false);
  const [deleteVendorError, setDeleteVendorError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<VendorContact | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  const [contactForm, setContactForm] = useState({
    name: '',
    designation: '',
    email: '',
    phone: '',
    alternate_phone: '',
    is_primary: false
  });

  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('vendors:write');
  const canDelete = hasPermission('vendors:delete');
  const canWriteContacts = hasPermission('vendor_contacts:write');
  const canDeleteContacts = hasPermission('vendor_contacts:delete');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [vendorData, contactsData] = await Promise.all([
        vendorsApi.getVendor(id),
        vendorsApi.getContacts(id)
      ]);
      setVendor(vendorData);
      setContacts(contactsData);
    } catch (err: any) {
      if (err.message.includes('404')) {
        setError('Vendor not found.');
      } else {
        setError(err.message || 'Failed to load vendor details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await vendorsApi.getContacts(id);
      setContacts(data);
    } catch (err) {
      // Background reload failure handled gracefully
    }
  };

  const handleDeleteVendor = async () => {
    try {
      setDeleteLoading(true);
      setDeleteVendorError(null);
      await vendorsApi.deleteVendor(id);
      router.push('/vendors');
    } catch (err: any) {
      setDeleteVendorError(err.message || 'Failed to delete vendor.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAddContact = () => {
    setEditingContact(null);
    setContactForm({ name: '', designation: '', email: '', phone: '', alternate_phone: '', is_primary: false });
    setContactError(null);
    setShowContactDialog(true);
  };

  const openEditContact = (c: VendorContact) => {
    setEditingContact(c);
    setContactForm({
      name: c.name,
      designation: c.designation || '',
      email: c.email || '',
      phone: c.phone || '',
      alternate_phone: c.alternate_phone || '',
      is_primary: c.is_primary
    });
    setContactError(null);
    setShowContactDialog(true);
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setContactForm(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    setContactError(null);

    try {
      const payload = {
        name: contactForm.name.trim(),
        designation: contactForm.designation.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        phone: contactForm.phone.trim() || undefined,
        alternate_phone: contactForm.alternate_phone.trim() || undefined,
        is_primary: contactForm.is_primary,
      };

      if (editingContact) {
        // Nullable updates
        const updatePayload: any = { ...payload };
        updatePayload.designation = contactForm.designation.trim() === '' ? null : payload.designation;
        updatePayload.email = contactForm.email.trim() === '' ? null : payload.email;
        updatePayload.phone = contactForm.phone.trim() === '' ? null : payload.phone;
        updatePayload.alternate_phone = contactForm.alternate_phone.trim() === '' ? null : payload.alternate_phone;

        await vendorsApi.updateContact(id, editingContact.id, updatePayload);
      } else {
        await vendorsApi.createContact(id, payload);
      }
      setShowContactDialog(false);
      loadContacts();
    } catch (err: any) {
      setContactError(err.message || 'Failed to save contact.');
    } finally {
      setContactLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    try {
      await vendorsApi.deleteContact(id, contactId);
      loadContacts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete contact.');
    }
  };

  if (loading) return <LoadingState />;
  if (error || !vendor) return (
    <div className="space-y-4">
      <ErrorState message={error || 'Vendor not found.'} onRetry={loadData} />
      <div className="flex justify-center">
        <Link href="/vendors"><Button variant="outline">Back to Vendors</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{vendor.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={vendor.status === 'ACTIVE' ? 'success' : 'secondary'}>{vendor.status}</Badge>
            {vendor.code && <span className="text-sm text-surface-500 font-mono">{vendor.code}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/vendors">
            <Button variant="outline">List</Button>
          </Link>
          {canWrite && (
            <Link href={`/vendors/${vendor.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setShowDeleteVendor(true)}>Delete</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase">Tax ID / GSTIN</p>
                <p className="text-surface-900 mt-1">{vendor.tax_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase">Address</p>
                <p className="text-surface-900 mt-1 whitespace-pre-wrap">{vendor.address || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase">Notes</p>
                <p className="text-surface-900 mt-1 whitespace-pre-wrap">{vendor.notes || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
              {canWriteContacts && (
                <Button size="sm" onClick={openAddContact}>Add Contact</Button>
              )}
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="py-6 text-center text-surface-500 text-sm">
                  No contacts found.
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map(c => (
                    <div key={c.id} className="p-4 border border-surface-200 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-surface-900">{c.name}</h3>
                          {c.is_primary && <Badge variant="primary" className="text-[10px] px-1.5 py-0">Primary</Badge>}
                        </div>
                        {c.designation && <p className="text-sm text-surface-500">{c.designation}</p>}
                        
                        <div className="mt-2 text-sm text-surface-700 flex flex-col sm:flex-row sm:gap-4">
                          {c.email && <span>📧 {c.email}</span>}
                          {c.phone && <span>📞 {c.phone}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                        {canWriteContacts && (
                          <Button size="sm" variant="outline" onClick={() => openEditContact(c)}>Edit</Button>
                        )}
                        {canDeleteContacts && (
                          <Button size="sm" variant="ghost" className="text-danger" onClick={() => handleDeleteContact(c.id)}>Remove</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDeleteVendor} onClose={() => setShowDeleteVendor(false)}>
        <DialogHeader>
          <h2 className="text-lg font-bold">Delete Vendor</h2>
        </DialogHeader>
        <DialogContent>
          <p>Are you sure you want to delete <strong>{vendor.name}</strong>?</p>
          <p className="text-sm text-surface-500 mt-2">This action cannot be undone. Associated dependencies may prevent deletion.</p>
          {deleteVendorError && <p className="text-sm text-danger mt-2">{deleteVendorError}</p>}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteVendor(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteVendor} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete Vendor'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={showContactDialog} onClose={() => setShowContactDialog(false)}>
        <DialogHeader>
          <h2 className="text-lg font-bold">{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
        </DialogHeader>
        <form onSubmit={handleSaveContact}>
          <DialogContent className="space-y-4">
            {contactError && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{contactError}</div>}
            
            <FormField label="Name" htmlFor="contactName">
              <Input id="contactName" name="name" required maxLength={255} value={contactForm.name} onChange={handleContactChange} />
            </FormField>
            
            <FormField label="Designation / Role" htmlFor="designation">
              <Input id="designation" name="designation" maxLength={100} value={contactForm.designation} onChange={handleContactChange} />
            </FormField>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" maxLength={255} value={contactForm.email} onChange={handleContactChange} />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" maxLength={50} value={contactForm.phone} onChange={handleContactChange} />
              </FormField>
            </div>
            
            <FormField label="Alternate Phone" htmlFor="alternate_phone">
              <Input id="alternate_phone" name="alternate_phone" maxLength={50} value={contactForm.alternate_phone} onChange={handleContactChange} />
            </FormField>
            
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="is_primary" name="is_primary" checked={contactForm.is_primary} onChange={handleContactChange} className="w-4 h-4 text-brand-600 border-surface-300 rounded focus:ring-brand-500" />
              <label htmlFor="is_primary" className="text-sm font-medium text-surface-700">Set as Primary Contact</label>
            </div>
            
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowContactDialog(false)}>Cancel</Button>
            <Button type="submit" disabled={contactLoading}>{contactLoading ? 'Saving...' : 'Save Contact'}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}




