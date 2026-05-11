FROM ghost:5

# Bake the cms-demo theme into the image. On first deploy the named volume
# ghost_content gets seeded from the image, so the theme appears in the admin
# under Settings → Design → Themes — activate it manually once.
# After volume exists, theme updates require manual upload via admin or
# editing /var/lib/ghost/content/themes/cms-demo/ inside the volume.
COPY theme /var/lib/ghost/content/themes
