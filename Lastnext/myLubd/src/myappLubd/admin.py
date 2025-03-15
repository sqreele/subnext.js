
from django.contrib import admin
from .models import Room, Topic, JobImage, Job, Property,UserProfile
from django.utils.html import format_html
@admin.register(JobImage)
class JobImageAdmin(admin.ModelAdmin):
    list_display = ('image_preview', 'get_image_url', 'get_uploaded_by', 'get_uploaded_at')
    list_filter = (('uploaded_at', admin.DateFieldListFilter),)
    readonly_fields = ('get_uploaded_at', 'image_preview')
    
    def image_preview(self, obj):
        # Assuming your field is named 'image' in your model
        if obj.image:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit: cover;" />',
                obj.image.url
            )
        return "No Image"
    image_preview.short_description = 'Preview'
    
    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return "-"
    get_image_url.short_description = 'Image URL'
    
    def get_uploaded_by(self, obj):
        return obj.uploaded_by
    get_uploaded_by.short_description = 'Uploaded By'
    
    def get_uploaded_at(self, obj):
        return obj.uploaded_at
    get_uploaded_at.short_description = 'Upload Date'
    
    
    
@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'room_type', 'is_active', 'created_at')
    list_filter = ('room_type', 'is_active','properties')
    search_fields = ['name']
    def get_properties(self, obj):
        # Get first 3 properties and add '...' if there are more
        properties = obj.properties.all()[:3]
        property_list = [p.name for p in properties]
        if obj.properties.count() > 3:
            property_list.append('...')
        return ", ".join(property_list)
    get_properties.short_description = 'Properties'
@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('title', 'description','id')  # Use 'topic_id' instead of 'id'
    search_fields = ['title']

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('job_id', 'user', 'status', 'priority' ,'remarks', 'created_at', 'completed_at')
    list_filter = ('status', 'priority', 'created_at')
    search_fields = ('job_id', 'description')

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'property_id', 'created_at')
    search_fields = ('name', 'property_id')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'positions', 'profile_image_tag')
    search_fields = ('user__username',)
    list_filter = ('user__is_active',)
    
    def profile_image_tag(self, obj):
        if obj.profile_image:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit: cover;" />',
                obj.profile_image.url
            )
        return "No Image"
    profile_image_tag.short_description = 'Profile Image'