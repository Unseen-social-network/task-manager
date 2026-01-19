import { useState } from 'react'
import { Edit2, Trash2, Mail, Phone, Building, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Contact, UpdateContactInput } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ContactForm } from './ContactForm'
import { contactsService } from '@/services/contacts.service'
import { formatDate } from '@/utils/helpers'

interface ContactDetailsModalProps {
  contact: Contact
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export const ContactDetailsModal = ({
  contact,
  isOpen,
  onClose,
  onUpdate,
}: ContactDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleUpdate = async (data: UpdateContactInput) => {
    try {
      await contactsService.updateContact(contact.id, data)
      toast.success('Contact updated successfully')
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      toast.error('Failed to update contact')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    setIsDeleting(true)
    try {
      await contactsService.deleteContact(contact.id)
      toast.success('Contact deleted successfully')
      onClose()
      onUpdate()
    } catch (error) {
      toast.error('Failed to delete contact')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isEditing) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Contact">
        <ContactForm
          initialData={{
            name: contact.name,
            company: contact.company,
            phone: contact.phone,
            email: contact.email,
            telegram: contact.telegram,
            notes: contact.notes,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contact Details"
      footer={
        <>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Name and Company */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{contact.name}</h2>
          {contact.company && (
            <div className="flex items-center gap-2 text-gray-600 mt-2">
              <Building className="w-4 h-4" />
              <span>{contact.company}</span>
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          {contact.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <a href={`tel:${contact.phone}`} className="text-primary-600 hover:underline">
                  {contact.phone}
                </a>
              </div>
            </div>
          )}

          {contact.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href={`mailto:${contact.email}`} className="text-primary-600 hover:underline">
                  {contact.email}
                </a>
              </div>
            </div>
          )}

          {contact.telegram && (
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Telegram</p>
                <span className="text-gray-900">{contact.telegram}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {contact.notes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
          <div>
            <span className="text-gray-500">Created:</span>{' '}
            <span className="text-gray-900">{formatDate(contact.created_at)}</span>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>{' '}
            <span className="text-gray-900">{formatDate(contact.updated_at)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
