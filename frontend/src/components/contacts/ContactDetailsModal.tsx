import { useEffect, useState } from 'react'
import { Edit2, Trash2, Mail, Phone, Building, MessageCircle, AtSign, Link2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Contact, UpdateContactInput } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ContactForm } from './ContactForm'
import { contactsService } from '@/services/contacts.service'
import { formatDate } from '@/utils/helpers'
import { useLocale } from '@/contexts/localeContext'

interface ContactDetailsModalProps {
  contact: Contact
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  isReadOnly?: boolean
  onRemoveShare?: () => void
}

export const ContactDetailsModal = ({
  contact,
  isOpen,
  onClose,
  onUpdate,
  isReadOnly = false,
  onRemoveShare,
}: ContactDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'sharing'>('details')
  const [shareAccesses, setShareAccesses] = useState<
    Array<{ user_id: number; username: string; email: string; created_at: string }>
  >([])
  const [shareAccessError, setShareAccessError] = useState<string | null>(null)
  const [shareAccessLoading, setShareAccessLoading] = useState(false)
  const { t } = useLocale()
  const isOwner = contact.is_owner !== false

  const handleUpdate = async (data: UpdateContactInput) => {
    try {
      await contactsService.updateContact(contact.id, data)
      toast.success(t('contacts.updateSuccess'))
      setIsEditing(false)
      onUpdate()
    } catch {
      toast.error(t('contacts.updateFail'))
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('contacts.deleteConfirm'))) return

    setIsDeleting(true)
    try {
      await contactsService.deleteContact(contact.id)
      toast.success(t('contacts.deleteSuccess'))
      onClose()
      onUpdate()
    } catch {
      toast.error(t('contacts.deleteFail'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = async (mode: 'link' | 'copy') => {
    try {
      const share = await contactsService.createShare(contact.id)
      const url = mode === 'link' ? share.share_url : share.copy_url
      await navigator.clipboard.writeText(url)
      toast.success(
        mode === 'link' ? t('contacts.shareLinkSuccess') : t('contacts.shareCopySuccess')
      )
    } catch {
      toast.error(t('contacts.shareFail'))
    }
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab('details')
      setShareAccessError(null)
    }
  }, [isOpen, contact.id])

  useEffect(() => {
    if (!isOpen || activeTab !== 'sharing' || !isOwner) return
    let isActive = true
    const fetchAccesses = async () => {
      setShareAccessLoading(true)
      setShareAccessError(null)
      try {
        const accessList = await contactsService.getContactAccess(contact.id)
        if (!isActive) return
        setShareAccesses(accessList)
      } catch {
        if (!isActive) return
        setShareAccessError(t('contacts.shareAccessLoadFail'))
      } finally {
        if (isActive) setShareAccessLoading(false)
      }
    }
    void fetchAccesses()
    return () => {
      isActive = false
    }
  }, [activeTab, contact.id, isOpen, isOwner, t])

  if (isEditing && !isReadOnly) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('contacts.editTitle')}>
        <ContactForm
          initialData={{
            name: contact.name,
            username: contact.username,
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
      title={t('contacts.detailsTitle')}
      footer={
        <>
          {!isReadOnly && isOwner && (
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('actions.delete')}
            </Button>
          )}
          {isReadOnly && !isOwner && onRemoveShare && (
            <Button variant="secondary" onClick={onRemoveShare}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('contacts.shareRemove')}
            </Button>
          )}
          {isOwner && (
            <Button variant="secondary" onClick={() => handleShare('link')}>
              <Link2 className="w-4 h-4 mr-2" />
              {t('contacts.shareLink')}
            </Button>
          )}
          {isOwner && (
            <Button variant="secondary" onClick={() => handleShare('copy')}>
              <Copy className="w-4 h-4 mr-2" />
              {t('contacts.shareCopy')}
            </Button>
          )}
          {!isReadOnly && isOwner && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('actions.edit')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {isReadOnly && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('contacts.shareReadOnly')}
          </p>
        )}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'details'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            {t('contacts.tabs.details')}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('sharing')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'sharing'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              {t('contacts.tabs.sharing')}
            </button>
          )}
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-6">
            {/* Name and Company */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {contact.name}
              </h2>
              {contact.company && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mt-2">
                  <Building className="w-4 h-4" />
                  <span>{contact.company}</span>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              {contact.username && (
                <div className="flex items-center gap-3">
                  <AtSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('contacts.username')}
                    </p>
                    <span className="text-gray-900 dark:text-gray-100">
                      @{contact.username}
                    </span>
                  </div>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('contacts.phone')}
                    </p>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('contacts.email')}
                    </p>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('contacts.telegram')}
                    </p>
                    <span className="text-gray-900 dark:text-gray-100">
                      {contact.telegram}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {contact.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  {t('contacts.notes')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-gray-200 dark:border-gray-800">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  {t('contacts.created')}
                </span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(contact.created_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  {t('contacts.updated')}
                </span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(contact.updated_at)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('contacts.shareAccessHint')}
            </p>
            {shareAccessLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('contacts.shareAccessLoading')}
              </p>
            ) : shareAccessError ? (
              <p className="text-sm text-red-500">{shareAccessError}</p>
            ) : shareAccesses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('contacts.shareAccessEmpty')}
              </p>
            ) : (
              <div className="space-y-2">
                {shareAccesses.map(access => (
                  <div
                    key={access.user_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {access.username}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">{access.email}</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await contactsService.revokeContactAccess(contact.id, access.user_id)
                          setShareAccesses(prev =>
                            prev.filter(item => item.user_id !== access.user_id)
                          )
                        } catch {
                          toast.error(t('contacts.shareAccessRemoveFail'))
                        }
                      }}
                    >
                      {t('contacts.shareAccessRemove')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
